"""
Optimized Fast Training for Perfect 4-Class Model
- Uses EfficientNet-B1 (faster than B2, still excellent)
- Aggressive but effective training schedule
- Target: >95% accuracy in <1 hour
"""
import os
import random
import time
from collections import Counter

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms, models
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, classification_report

# ========= Config =========
DATA_DIR = "datasets"
RESULTS_DIR = "results"
os.makedirs(RESULTS_DIR, exist_ok=True)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BATCH_SIZE = 48  # Increased for faster training
EPOCHS_STAGE1 = 3  # Reduced but with higher LR
EPOCHS_STAGE2 = 15  # Focused fine-tuning
LR_STAGE1 = 2e-3  # Higher initial LR
LR_STAGE2 = 1e-4
SEED = 42
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15
NUM_WORKERS = 0
PATIENCE = 4

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

CLASS_NAMES = ['Normal', 'Oral_Cancer', 'benign_lesions', 'lichen_planus']
NUM_CLASSES = len(CLASS_NAMES)

# ========= Transforms =========
train_tfms = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomResizedCrop(224, scale=(0.75, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(p=0.3),
    transforms.RandomRotation(degrees=12),
    transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

val_test_tfms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# ========= Dataset =========
class OralDiseaseDataset(Dataset):
    def __init__(self, data_dir, class_names, tfm=None, subset_indices=None):
        self.data_dir = data_dir
        self.class_names = class_names
        self.tfm = tfm
        
        self.samples = []
        for class_idx, class_name in enumerate(class_names):
            class_dir = os.path.join(data_dir, class_name)
            if not os.path.isdir(class_dir):
                continue
            
            for root, _, files in os.walk(class_dir):
                for f in files:
                    if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
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

def split_indices(n, val_split, test_split, seed=42):
    idxs = list(range(n))
    random.Random(seed).shuffle(idxs)
    test_n = int(n * test_split)
    val_n = int(n * val_split)
    test_idxs = idxs[:test_n]
    val_idxs = idxs[test_n:test_n + val_n]
    train_idxs = idxs[test_n + val_n:]
    return train_idxs, val_idxs, test_idxs

# ========= Model - Using B1 for speed =========
def build_efficientnet_b1(num_classes):
    model = models.efficientnet_b1(weights=models.EfficientNet_B1_Weights.DEFAULT)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

def freeze_backbone(model, freeze=True):
    for name, param in model.named_parameters():
        if "classifier" not in name:
            param.requires_grad = not freeze

class FocalLoss(nn.Module):
    def __init__(self, alpha=1.0, gamma=2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.ce = nn.CrossEntropyLoss(reduction="none")
    
    def forward(self, logits, targets):
        ce_loss = self.ce(logits, targets)
        pt = torch.exp(-ce_loss)
        loss = self.alpha * (1 - pt) ** self.gamma * ce_loss
        return loss.mean()

class EarlyStopping:
    def __init__(self, patience=4):
        self.patience = patience
        self.best = None
        self.counter = 0
        self.early_stop = False
    
    def step(self, metric_value):
        if self.best is None:
            self.best = metric_value
            return False
        if metric_value < self.best - 1e-4:
            self.best = metric_value
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        return self.early_stop

def build_balanced_sampler(dataset):
    labels = [lbl for _, lbl, _ in dataset]
    counts = Counter(labels)
    num_samples = len(labels)
    class_weights = {cls: num_samples / (len(counts) * cnt) for cls, cnt in counts.items()}
    sample_weights = [class_weights[lbl] for lbl in labels]
    return WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)

def eval_on_loader(model, dl, criterion, class_names, split="Val"):
    model.eval()
    loss_sum, total, correct = 0.0, 0, 0
    all_labels, all_preds = [], []
    
    with torch.no_grad():
        for x, y, _ in dl:
            x, y = x.to(DEVICE), y.to(DEVICE)
            logits = model(x)
            loss = criterion(logits, y)
            loss_sum += loss.item() * x.size(0)
            total += x.size(0)
            preds = logits.argmax(1)
            correct += (preds == y).sum().item()
            all_labels.extend(y.cpu().numpy())
            all_preds.extend(preds.cpu().numpy())
    
    avg_loss = loss_sum / total
    acc = correct / total
    
    print(f"{split} Loss: {avg_loss:.4f} Acc: {acc:.4f} ({acc*100:.2f}%)")
    
    if split == "Test":
        cm = confusion_matrix(all_labels, all_preds)
        plt.figure(figsize=(8, 7))
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                    xticklabels=class_names, yticklabels=class_names)
        plt.xlabel("Predicted")
        plt.ylabel("True")
        plt.title("4-Class Model - Final Performance")
        plt.tight_layout()
        plt.savefig(os.path.join(RESULTS_DIR, "cm_4class_fast.png"), dpi=150)
        plt.close()
        
        report = classification_report(all_labels, all_preds, target_names=class_names)
        print(f"\\nClassification Report:\\n{report}")
        with open(os.path.join(RESULTS_DIR, "report_4class_fast.txt"), "w") as f:
            f.write(report)
        
        # Per-class accuracy
        print(f"\\n{'='*60}")
        print("Per-Class Accuracy:")
        for i, (pred_row, class_name) in enumerate(zip(cm, class_names)):
            class_total = pred_row.sum()
            class_correct = pred_row[i]
            class_acc = (class_correct / class_total * 100) if class_total > 0 else 0
            print(f"  {class_name:20s}: {class_correct:3d}/{class_total:3d} = {class_acc:.1f}%")
        print(f"{'='*60}")
    
    return avg_loss, acc

def train_model():
    print(f"\\n{'='*80}")
    print(f"OPTIMIZED FAST TRAINING - 4-Class Oral Disease Classifier")
    print(f"{'='*80}")
    print(f"Device: {DEVICE}")
    print(f"Model: EfficientNet-B1 (optimized for speed)")
    print(f"Target: >95% accuracy in <60 minutes")
    print(f"{'='*80}\\n")
    
    # Load data
    full_ds = OralDiseaseDataset(DATA_DIR, CLASS_NAMES, tfm=val_test_tfms)
    n = len(full_ds)
    print(f"Total samples: {n}")
    
    train_idx, val_idx, test_idx = split_indices(n, VAL_SPLIT, TEST_SPLIT, SEED)
    
    train_ds = OralDiseaseDataset(DATA_DIR, CLASS_NAMES, tfm=train_tfms, subset_indices=train_idx)
    val_ds = OralDiseaseDataset(DATA_DIR, CLASS_NAMES, tfm=val_test_tfms, subset_indices=val_idx)
    test_ds = OralDiseaseDataset(DATA_DIR, CLASS_NAMES, tfm=val_test_tfms, subset_indices=test_idx)
    
    print(f"Train: {len(train_ds)}, Val: {len(val_ds)}, Test: {len(test_ds)}\\n")
    
    sampler = build_balanced_sampler(train_ds)
    train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler, num_workers=NUM_WORKERS)
    val_dl = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS)
    test_dl = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS)
    
    model = build_efficientnet_b1(NUM_CLASSES).to(DEVICE)
    criterion = FocalLoss(alpha=1.0, gamma=2.0)
    
    # Stage 1: Classifier only
    print(f"\\n{'='*80}")
    print(f"STAGE 1: Classifier Training ({EPOCHS_STAGE1} epochs)")
    print(f"{'='*80}\\n")
    freeze_backbone(model, freeze=True)
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), 
                                   lr=LR_STAGE1, weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS_STAGE1)
    
    best_val_loss = float("inf")
    best_state = None
    
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
        
        val_loss, val_acc = eval_on_loader(model, val_dl, criterion, CLASS_NAMES, "Val")
        scheduler.step()
        
        print(f"Epoch {epoch}/{EPOCHS_STAGE1} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}\\n")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = model.state_dict().copy()
    
    if best_state:
        model.load_state_dict(best_state)
    
    # Stage 2: Full model
    print(f"\\n{'='*80}")
    print(f"STAGE 2: Full Model Fine-Tuning ({EPOCHS_STAGE2} epochs)")
    print(f"{'='*80}\\n")
    freeze_backbone(model, freeze=False)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR_STAGE2, weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS_STAGE2)
    
    best_val_loss = float("inf")
    best_state = None
    es = EarlyStopping(patience=PATIENCE)
    
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
        
        val_loss, val_acc = eval_on_loader(model, val_dl, criterion, CLASS_NAMES, "Val")
        scheduler.step()
        
        print(f"Epoch {epoch}/{EPOCHS_STAGE2} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}\\n")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {
                "model_state": model.state_dict(),
                "class_names": CLASS_NAMES,
                "val_loss": val_loss,
                "val_acc": val_acc
            }
        
        if es.step(val_loss):
            print(f"Early stopping at epoch {epoch}\\n")
            break
    
    # Save best model
    save_path = os.path.join(RESULTS_DIR, "efficientnet_b1_4class_fast_BEST.pth")
    if best_state:
        torch.save(best_state, save_path)
        model.load_state_dict(best_state["model_state"])
        print(f"\\n✅ Best model saved: {save_path}")
        print(f"Best Val Loss: {best_state['val_loss']:.4f}, Acc: {best_state['val_acc']:.4f}\\n")
    
    # Final test
    print(f"\\n{'='*80}")
    print("FINAL TEST EVALUATION")
    print(f"{'='*80}\\n")
    test_loss, test_acc = eval_on_loader(model, test_dl, criterion, CLASS_NAMES, "Test")
    
    print(f"\\n{'='*80}")
    print(f"✅ TRAINING COMPLETE!")
    print(f"Test Accuracy: {test_acc*100:.2f}%")
    print(f"Model saved: {save_path}")
    print(f"{'='*80}\\n")
    
    return model, test_acc

if __name__ == "__main__":
    start = time.time()
    model, test_acc = train_model()
    elapsed = time.time() - start
    print(f"Total training time: {elapsed/60:.1f} minutes")
    print(f"Final test accuracy: {test_acc*100:.2f}%")
