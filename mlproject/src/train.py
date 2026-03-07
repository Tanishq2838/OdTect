import os
import random
import time
from typing import List, Dict, Tuple
from collections import Counter

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms, models
from PIL import Image

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, classification_report, roc_auc_score

# ========= Config =========
DATA_DIR = "datasets"  # root with: Normal, Oral_Cancer, benign_lesions, lichen_planus
RESULTS_DIR = "results"
os.makedirs(RESULTS_DIR, exist_ok=True)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BATCH_SIZE = 32
EPOCHS_STAGE1 = 5      # classifier only
EPOCHS_STAGE2 = 20     # fine-tune whole model
LR_STAGE1 = 1e-3
LR_STAGE2 = 1e-4
SEED = 42
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15
NUM_WORKERS = 4
PATIENCE = 5           # early stopping patience based on val loss

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

# ========= Transforms =========
train_tfms = transforms.Compose([
    transforms.Resize((300, 300)),
    transforms.RandomResizedCrop(260, scale=(0.7, 1.0), ratio=(0.75, 1.33)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(p=0.3),
    transforms.RandomRotation(degrees=15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1, hue=0.02),
    transforms.RandomApply([transforms.GaussianBlur(kernel_size=3)], p=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

val_test_tfms = transforms.Compose([
    transforms.Resize((260, 260)),
    transforms.CenterCrop(260),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# ========= Task config =========
TASKS = {
    "normal_abnormal": {
        "include": ["Normal", "Oral_Cancer", "benign_lesions", "lichen_planus"],
        "map": {"Normal": 0, "Oral_Cancer": 1, "benign_lesions": 1, "lichen_planus": 1},
        "class_names": ["Normal", "Abnormal"],
    },
    "precancer_cancer": {
        "include": ["lichen_planus", "Oral_Cancer"],
        "map": {"lichen_planus": 0, "Oral_Cancer": 1},
        "class_names": ["PreCancer", "Cancer"],
    },
    "benign_malignant": {
        "include": ["benign_lesions", "Oral_Cancer"],
        "map": {"benign_lesions": 0, "Oral_Cancer": 1},
        "class_names": ["Benign", "Malignant"],
    }
}

# ========= Dataset =========
class FilteredImageDataset(Dataset):
    def __init__(self, data_dir: str, include_folders: List[str], label_map: Dict[str, int],
                 tfm=None, subset_indices: List[int] = None):
        self.data_dir = data_dir
        self.include_folders = include_folders
        self.label_map = label_map
        self.tfm = tfm

        self.samples = []
        for cls in include_folders:
            cls_dir = os.path.join(data_dir, cls)
            if not os.path.isdir(cls_dir):
                continue
            for root, _, files in os.walk(cls_dir):
                for f in files:
                    if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff")):
                        path = os.path.join(root, f)
                        self.samples.append((path, label_map[cls]))

        if subset_indices is not None:
            self.samples = [self.samples[i] for i in subset_indices]

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.tfm:
            img = self.tfm(img)
        return img, label, path

def split_indices(n: int, val_split: float, test_split: float, seed: int = 42):
    idxs = list(range(n))
    random.Random(seed).shuffle(idxs)
    test_n = int(n * test_split)
    val_n = int(n * val_split)
    test_idxs = idxs[:test_n]
    val_idxs = idxs[test_n:test_n + val_n]
    train_idxs = idxs[test_n + val_n:]
    return train_idxs, val_idxs, test_idxs

# ========= Model & loss =========
def build_efficientnet(num_classes: int, version: str = "b2") -> nn.Module:
    if version == "b0":
        model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    elif version == "b2":
        model = models.efficientnet_b2(weights=models.EfficientNet_B2_Weights.DEFAULT)
    elif version == "b3":
        model = models.efficientnet_b3(weights=models.EfficientNet_B3_Weights.DEFAULT)
    else:
        raise ValueError("Unsupported EfficientNet version")

    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

def freeze_backbone(model, freeze=True):
    for name, param in model.named_parameters():
        if "classifier" not in name:
            param.requires_grad = not freeze

class FocalLoss(nn.Module):
    def __init__(self, alpha=1.0, gamma=2.0, reduction="mean"):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction
        self.ce = nn.CrossEntropyLoss(reduction="none")

    def forward(self, logits, targets):
        ce_loss = self.ce(logits, targets)
        pt = torch.exp(-ce_loss)
        loss = self.alpha * (1 - pt) ** self.gamma * ce_loss
        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss

# ========= Early stopping =========
class EarlyStopping:
    def __init__(self, patience=5, min_delta=0.0):
        self.patience = patience
        self.min_delta = min_delta
        self.best = None
        self.counter = 0
        self.early_stop = False

    def step(self, metric_value):
        if self.best is None:
            self.best = metric_value
            return False
        if metric_value < self.best - self.min_delta:
            self.best = metric_value
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        return self.early_stop

# ========= Grad-CAM =========
class GradCAM:
    def __init__(self, model: nn.Module, target_layer_name: str):
        self.model = model
        self.model.eval()
        self.target_layer = self._get_layer(target_layer_name)

        self.gradients = None
        self.activations = None

        def fwd_hook(module, inp, out):
            self.activations = out.detach()

        def bwd_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        self.target_layer.register_forward_hook(fwd_hook)
        self.target_layer.register_backward_hook(bwd_hook)

    def _get_layer(self, name: str):
        if name == "features[-1]":
            return self.model.features[-1]
        return eval(f"self.model.{name}")

    def generate(self, input_tensor: torch.Tensor, target_class: int):
        self.model.zero_grad()
        logits = self.model(input_tensor)
        score = logits[:, target_class].sum()
        score.backward()

        grads = self.gradients
        acts = self.activations
        weights = grads.mean(dim=(2, 3), keepdim=True)
        cam = (weights * acts).sum(dim=1, keepdim=True)
        cam = torch.relu(cam)

        cam = cam.squeeze(1)
        cam_min, cam_max = cam.min(), cam.max()
        cam = (cam - cam_min) / (cam_max - cam_min + 1e-8)
        cam = torch.nn.functional.interpolate(
            cam.unsqueeze(1),
            size=(input_tensor.size(2), input_tensor.size(3)),
            mode="bilinear",
            align_corners=False
        )
        cam = cam.squeeze(1)
        return cam.cpu().numpy(), logits.detach().cpu().numpy()

def overlay_cam_on_image(img_tensor: torch.Tensor, cam: np.ndarray, alpha: float = 0.5):
    mean = np.array([0.485, 0.456, 0.406]).reshape(3, 1, 1)
    std = np.array([0.229, 0.224, 0.225]).reshape(3, 1, 1)
    img_np = img_tensor.cpu().numpy()
    img_np = (img_np * std + mean).clip(0, 1)
    img_np = np.transpose(img_np, (1, 2, 0))

    heatmap = cam
    heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)
    heatmap = plt.cm.jet(heatmap)[..., :3]

    overlay = (alpha * heatmap + (1 - alpha) * img_np)
    overlay = overlay.clip(0, 1)
    return img_np, overlay

def run_gradcam_on_samples(model: nn.Module, class_names: List[str], dataset: Dataset,
                           task_name: str, num_samples_per_class: int = 3):
    gradcam = GradCAM(model, target_layer_name="features[-1]")

    idxs_by_class = {i: [] for i in range(len(class_names))}
    for i in range(len(dataset)):
        _, y, _ = dataset[i]
        if len(idxs_by_class[y]) < num_samples_per_class:
            idxs_by_class[y].append(i)

    for cls_idx, idxs in idxs_by_class.items():
        for k, idx in enumerate(idxs):
            x, y, path = dataset[idx]
            x = x.unsqueeze(0).to(DEVICE)

            cams, logits = gradcam.generate(x, target_class=cls_idx)
            cam = cams[0]
            img_np, overlay = overlay_cam_on_image(x[0], cam)

            plt.figure(figsize=(8, 3))
            plt.suptitle(
                f"{task_name} | True: {class_names[y]} | Target CAM: {class_names[cls_idx]}\n{os.path.basename(path)}"
            )
            plt.subplot(1, 2, 1); plt.imshow(img_np); plt.axis("off"); plt.title("Image")
            plt.subplot(1, 2, 2); plt.imshow(overlay); plt.axis("off"); plt.title("Grad-CAM")
            plt.tight_layout()
            out_path = os.path.join(
                RESULTS_DIR, f"gradcam_{task_name}_{class_names[cls_idx]}_{k}.png"
            )
            plt.savefig(out_path, dpi=150)
            plt.close()
            print(f"[{task_name}] Saved Grad-CAM: {out_path}")

# ========= Training for one task =========
def build_balanced_sampler(dataset: Dataset):
    labels = [lbl for _, lbl, _ in dataset]
    counts = Counter(labels)
    num_samples = len(labels)
    class_weights = {cls: num_samples / (len(counts) * cnt) for cls, cnt in counts.items()}
    sample_weights = [class_weights[lbl] for lbl in labels]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)
    print("Class counts:", counts)
    print("Class weights:", class_weights)
    return sampler

def eval_on_loader(model, dl, criterion, num_classes, class_names, task_name, split="Val"):
    model.eval()
    loss_sum, total, correct = 0.0, 0, 0
    all_labels, all_preds, all_probs = [], [], []

    with torch.no_grad():
        for x, y, _ in dl:
            x, y = x.to(DEVICE), y.to(DEVICE)
            logits = model(x)
            loss = criterion(logits, y)
            loss_sum += loss.item() * x.size(0)
            total += x.size(0)
            preds = logits.argmax(1)
            correct += (preds == y).sum().item()

            all_labels.extend(y.cpu().numpy().tolist())
            all_preds.extend(preds.cpu().numpy().tolist())
            probs = torch.softmax(logits, dim=1).cpu().numpy()
            all_probs.extend(probs.tolist())

    avg_loss = loss_sum / total
    acc = correct / total

    print(f"[{task_name}] {split} Loss: {avg_loss:.4f} Acc: {acc:.4f}")

    if split == "Test":
        cm = confusion_matrix(all_labels, all_preds)
        plt.figure(figsize=(6, 5))
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                    xticklabels=class_names, yticklabels=class_names)
        plt.xlabel("Predicted")
        plt.ylabel("True")
        plt.title(f"Confusion Matrix - {task_name}")
        plt.tight_layout()
        plt.savefig(os.path.join(RESULTS_DIR, f"cm_{task_name}.png"))
        plt.close()

        report = classification_report(all_labels, all_preds, target_names=class_names)
        print(f"[{task_name}] Classification Report:\n{report}")
        with open(os.path.join(RESULTS_DIR, f"report_{task_name}.txt"), "w") as f:
            f.write(report)

        # For binary tasks, also compute AUC
        if num_classes == 2:
            probs_pos = np.array(all_probs)[:, 1]
            try:
                auc = roc_auc_score(all_labels, probs_pos)
                print(f"[{task_name}] Test AUC: {auc:.4f}")
            except Exception as e:
                print(f"[{task_name}] AUC could not be computed: {e}")

    return avg_loss, acc

def train_one_task(task_name: str):
    cfg = TASKS[task_name]
    include = cfg["include"]
    label_map = cfg["map"]
    class_names = cfg["class_names"]
    num_classes = len(class_names)

    full_ds = FilteredImageDataset(DATA_DIR, include, label_map, tfm=val_test_tfms)
    n = len(full_ds)
    train_idx, val_idx, test_idx = split_indices(n, VAL_SPLIT, TEST_SPLIT, SEED)

    train_ds = FilteredImageDataset(DATA_DIR, include, label_map, tfm=train_tfms, subset_indices=train_idx)
    val_ds = FilteredImageDataset(DATA_DIR, include, label_map, tfm=val_test_tfms, subset_indices=val_idx)
    test_ds = FilteredImageDataset(DATA_DIR, include, label_map, tfm=val_test_tfms, subset_indices=test_idx)

    print(f"[{task_name}] Train: {len(train_ds)}, Val: {len(val_ds)}, Test: {len(test_ds)}")

    sampler = build_balanced_sampler(train_ds)

    train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler,
                          num_workers=NUM_WORKERS, pin_memory=True)
    val_dl = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False,
                        num_workers=NUM_WORKERS, pin_memory=True)
    test_dl = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False,
                         num_workers=NUM_WORKERS, pin_memory=True)

    model = build_efficientnet(num_classes, version="b2").to(DEVICE)
    criterion = FocalLoss(alpha=1.0, gamma=2.0)

    # ===== Stage 1: train classifier only =====
    print(f"[{task_name}] Stage 1: training classifier only")
    freeze_backbone(model, freeze=True)
    optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=LR_STAGE1)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=2)

    best_val_loss = float("inf")
    best_state = None
    es = EarlyStopping(patience=PATIENCE, min_delta=1e-4)

    for epoch in range(1, EPOCHS_STAGE1 + 1):
        model.train()
        train_loss_sum, total = 0.0, 0
        for x, y, _ in train_dl:
            x, y = x.to(DEVICE), y.to(DEVICE)
            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            train_loss_sum += loss.item() * x.size(0)
            total += x.size(0)
        train_loss = train_loss_sum / total

        val_loss, val_acc = eval_on_loader(model, val_dl, criterion, num_classes, class_names, task_name, split="Val")
        scheduler.step(val_loss)

        print(f"[{task_name}] Stage1 Epoch {epoch}/{EPOCHS_STAGE1} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {
                "model_state": model.state_dict(),
                "optimizer_state": optimizer.state_dict(),
                "class_names": class_names
            }

        if es.step(val_loss):
            print(f"[{task_name}] Early stopping in Stage 1 at epoch {epoch}")
            break

    if best_state is not None:
        model.load_state_dict(best_state["model_state"])

    # ===== Stage 2: unfreeze backbone and fine-tune =====
    print(f"[{task_name}] Stage 2: fine-tuning entire model")
    freeze_backbone(model, freeze=False)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR_STAGE2)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=2)

    best_val_loss = float("inf")
    best_state = None
    es = EarlyStopping(patience=PATIENCE, min_delta=1e-4)

    for epoch in range(1, EPOCHS_STAGE2 + 1):
        model.train()
        train_loss_sum, total = 0.0, 0
        for x, y, _ in train_dl:
            x, y = x.to(DEVICE), y.to(DEVICE)
            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            train_loss_sum += loss.item() * x.size(0)
            total += x.size(0)
        train_loss = train_loss_sum / total

        val_loss, val_acc = eval_on_loader(model, val_dl, criterion, num_classes, class_names, task_name, split="Val")
        scheduler.step(val_loss)

        print(f"[{task_name}] Stage2 Epoch {epoch}/{EPOCHS_STAGE2} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {
                "model_state": model.state_dict(),
                "optimizer_state": optimizer.state_dict(),
                "class_names": class_names
            }

        if es.step(val_loss):
            print(f"[{task_name}] Early stopping in Stage 2 at epoch {epoch}")
            break

    save_path = os.path.join(RESULTS_DIR, f"efficientnet_b2_{task_name}.pth")
    if best_state is not None:
        torch.save(best_state, save_path)
        model.load_state_dict(best_state["model_state"])
        print(f"[{task_name}] Saved best model to {save_path}")

    # ===== Test evaluation =====
    test_loss, test_acc = eval_on_loader(model, test_dl, criterion, num_classes, class_names, task_name, split="Test")
    print(f"[{task_name}] Final Test Acc: {test_acc:.4f}")

    return model, class_names, test_ds

# ========= Main =========
if __name__ == "__main__":
    start = time.time()
    print(f"Device: {DEVICE}")
    tasks_to_run = ["normal_abnormal", "precancer_cancer", "benign_malignant"]

    for task in tasks_to_run:
        print(f"\n=== Training task: {task} ===")
        model, class_names, test_ds = train_one_task(task)
        run_gradcam_on_samples(model, class_names, test_ds, task_name=task, num_samples_per_class=3)

    print(f"\nAll tasks completed. Results in: {RESULTS_DIR}")
    print(f"Total time: {(time.time() - start)/60:.1f} min")
