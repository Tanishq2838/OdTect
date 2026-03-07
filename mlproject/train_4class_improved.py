"""
Improved 4-Class Oral Disease Classification Model Training Script
Uses EfficientNet-B2 with enhanced training strategy
"""
import os
import random
import time
from typing import List, Dict
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
DATA_DIR = "datasets"
RESULTS_DIR = "results"
os.makedirs(RESULTS_DIR, exist_ok=True)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BATCH_SIZE = 32
EPOCHS_STAGE1 = 5      # classifier only
EPOCHS_STAGE2 = 25     # fine-tune whole model (increased from 20)
LR_STAGE1 = 1e-3
LR_STAGE2 = 1e-4
SEED = 42
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15
NUM_WORKERS = 0  # Set to 0 to avoid multiprocessing issues on Windows
PATIENCE = 5           # early stopping patience

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

# ========= Class names (4-class problem) =========
CLASS_NAMES = ['Normal', 'Oral_Cancer', 'benign_lesions', 'lichen_planus']
NUM_CLASSES = len(CLASS_NAMES)

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

# ========= Dataset =========
class OralDiseaseDataset(Dataset):
    def __init__(self, data_dir: str, class_names: List[str], tfm=None, subset_indices: List[int] = None):
        self.data_dir = data_dir
        self.class_names = class_names
        self.tfm = tfm
        
        self.samples = []
        for class_idx, class_name in enumerate(class_names):
            class_dir = os.path.join(data_dir, class_name)
            if not os.path.isdir(class_dir):
                print(f"Warning: Directory not found: {class_dir}")
                continue
            
            for root, _, files in os.walk(class_dir):
                for f in files:
                    if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff")):
                        path = os.path.join(root, f)
                        self.samples.append((path, class_idx))
        
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
    """Split indices into train/val/test sets"""
    idxs = list(range(n))
    random.Random(seed).shuffle(idxs)
    test_n = int(n * test_split)
    val_n = int(n * val_split)
    test_idxs = idxs[:test_n]
    val_idxs = idxs[test_n:test_n + val_n]
    train_idxs = idxs[test_n + val_n:]
    return train_idxs, val_idxs, test_idxs

# ========= Model =========
def build_efficientnet_b2(num_classes: int) -> nn.Module:
    """Build EfficientNet-B2 model"""
    model = models.efficientnet_b2(weights=models.EfficientNet_B2_Weights.DEFAULT)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

def freeze_backbone(model, freeze=True):
    """Freeze/unfreeze backbone layers"""
    for name, param in model.named_parameters():
        if "classifier" not in name:
            param.requires_grad = not freeze

# ========= Focal Loss =========
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

# ========= Early Stopping =========
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

# ========= Training utilities =========
def build_balanced_sampler(dataset: Dataset):
    """Create weighted sampler for balanced training"""
    labels = [lbl for _, lbl, _ in dataset]
    counts = Counter(labels)
    num_samples = len(labels)
    class_weights = {cls: num_samples / (len(counts) * cnt) for cls, cnt in counts.items()}
    sample_weights = [class_weights[lbl] for lbl in labels]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)
    print("Class counts:", counts)
    print("Class weights:", class_weights)
    return sampler

def eval_on_loader(model, dl, criterion, class_names, split="Val"):
    """Evaluate model on dataloader"""
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
    
    print(f"{split} Loss: {avg_loss:.4f} Acc: {acc:.4f}")
    
    if split == "Test":
        # Generate confusion matrix
        cm = confusion_matrix(all_labels, all_preds)
        plt.figure(figsize=(8, 7))
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                    xticklabels=class_names, yticklabels=class_names)
        plt.xlabel("Predicted")
        plt.ylabel("True")
        plt.title("Confusion Matrix - 4-Class Model")
        plt.tight_layout()
        plt.savefig(os.path.join(RESULTS_DIR, "cm_4class_improved.png"))
        plt.close()
        
        # Classification report
        report = classification_report(all_labels, all_preds, target_names=class_names)
        print(f"Classification Report:\\n{report}")
        with open(os.path.join(RESULTS_DIR, "report_4class_improved.txt"), "w") as f:
            f.write(report)
    
    return avg_loss, acc

# ========= Main Training Function =========
def train_4class_model():
    print(f"Device: {DEVICE}")
    print(f"Training 4-class model: {CLASS_NAMES}")
    
    # Load full dataset
    full_ds = OralDiseaseDataset(DATA_DIR, CLASS_NAMES, tfm=val_test_tfms)
    n = len(full_ds)
    print(f"Total samples: {n}")
    
    # Split data
    train_idx, val_idx, test_idx = split_indices(n, VAL_SPLIT, TEST_SPLIT, SEED)
    
    train_ds = OralDiseaseDataset(DATA_DIR, CLASS_NAMES, tfm=train_tfms, subset_indices=train_idx)
    val_ds = OralDiseaseDataset(DATA_DIR, CLASS_NAMES, tfm=val_test_tfms, subset_indices=val_idx)
    test_ds = OralDiseaseDataset(DATA_DIR, CLASS_NAMES, tfm=val_test_tfms, subset_indices=test_idx)
    
    print(f"Train: {len(train_ds)}, Val: {len(val_ds)}, Test: {len(test_ds)}")
    
    # Create data loaders
    sampler = build_balanced_sampler(train_ds)
    train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler,
                          num_workers=NUM_WORKERS, pin_memory=True)
    val_dl = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False,
                        num_workers=NUM_WORKERS, pin_memory=True)
    test_dl = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False,
                         num_workers=NUM_WORKERS, pin_memory=True)
    
    # Build model
    model = build_efficientnet_b2(NUM_CLASSES).to(DEVICE)
    criterion = FocalLoss(alpha=1.0, gamma=2.0)
    
    # ===== Stage 1: Train classifier only =====
    print(f"\\nStage 1: Training classifier only ({EPOCHS_STAGE1} epochs)")
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
        
        val_loss, val_acc = eval_on_loader(model, val_dl, criterion, CLASS_NAMES, split="Val")
        scheduler.step(val_loss)
        
        print(f"Stage1 Epoch {epoch}/{EPOCHS_STAGE1} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {
                "model_state": model.state_dict(),
                "optimizer_state": optimizer.state_dict(),
                "class_names": CLASS_NAMES,
                "epoch": epoch,
                "val_loss": val_loss,
                "val_acc": val_acc
            }
            # Persistent saving in case of termination
            torch.save(best_state, os.path.join(RESULTS_DIR, "best_model.pth"))
            print(f"  --> Saved new best model (Val Acc: {val_acc:.4f})")
        
        if es.step(val_loss):
            print(f"Early stopping in Stage 1 at epoch {epoch}")
            break
    
    if best_state is not None:
        model.load_state_dict(best_state["model_state"])
    
    # ===== Stage 2: Unfreeze and fine-tune =====
    print(f"\nStage 2: Fine-tuning entire model ({EPOCHS_STAGE2} epochs)")
    freeze_backbone(model, freeze=False)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR_STAGE2)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=2)
    
    best_val_loss = float("inf")
    # Don't reset best_state from Stage 1 if Stage 2 hasn't improved yet
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
        
        val_loss, val_acc = eval_on_loader(model, val_dl, criterion, CLASS_NAMES, split="Val")
        scheduler.step(val_loss)
        
        print(f"Stage2 Epoch {epoch}/{EPOCHS_STAGE2} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {
                "model_state": model.state_dict(),
                "optimizer_state": optimizer.state_dict(),
                "class_names": CLASS_NAMES,
                "epoch": epoch,
                "val_loss": val_loss,
                "val_acc": val_acc
            }
            # Persistent saving in case of termination
            torch.save(best_state, os.path.join(RESULTS_DIR, "best_model.pth"))
            print(f"  --> Saved new best model (Val Acc: {val_acc:.4f})")
        
        if es.step(val_loss):
            print(f"Early stopping in Stage 2 at epoch {epoch}")
            break
    
    # Save best model
    save_path = os.path.join(RESULTS_DIR, "efficientnet_b2_4class_improved.pth")
    if best_state is not None:
        torch.save(best_state, save_path)
        model.load_state_dict(best_state["model_state"])
        print(f"\\nSaved best model to {save_path}")
        print(f"Best validation - Loss: {best_state['val_loss']:.4f}, Acc: {best_state['val_acc']:.4f}")
    
    # ===== Test evaluation =====
    print(f"\\nFinal Test Evaluation:")
    test_loss, test_acc = eval_on_loader(model, test_dl, criterion, CLASS_NAMES, split="Test")
    print(f"Test Accuracy: {test_acc:.4f} ({test_acc*100:.2f}%)")
    
    return model, test_acc

if __name__ == "__main__":
    start = time.time()
    model, test_acc = train_4class_model()
    print(f"\\n{'='*80}")
    print(f"✅ Training completed successfully")
    print(f"Final Test Accuracy: {test_acc*100:.2f}%")
    print(f"Total time: {(time.time() - start)/60:.1f} min")
    print(f"{'='*80}")
