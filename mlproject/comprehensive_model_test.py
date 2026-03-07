"""
Comprehensive Model Testing Script
Tests all three trained models and analyzes their performance in detail
"""
import os
import random
import json
from collections import defaultdict

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from PIL import Image
import numpy as np
from sklearn.metrics import confusion_matrix, classification_report

# ========= Config =========
DATA_DIR = "datasets"
RESULTS_DIR = "results"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BATCH_SIZE = 32
SEED = 42
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

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
    def __init__(self, data_dir, include_folders, label_map, tfm=None, subset_indices=None):
        self.tfm = tfm
        self.samples = []
        self.original_class_names = []  # Track the original folder name
        
        for cls in include_folders:
            cls_dir = os.path.join(data_dir, cls)
            if not os.path.isdir(cls_dir):
                continue
            for root, _, files in os.walk(cls_dir):
                for f in files:
                    if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff")):
                        path = os.path.join(root, f)
                        self.samples.append((path, label_map[cls], cls))  # Include original class name

        if subset_indices is not None:
            self.samples = [self.samples[i] for i in subset_indices]

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label, orig_class = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.tfm:
            img = self.tfm(img)
        return img, label, path, orig_class

def split_indices(n, val_split, test_split, seed=42):
    idxs = list(range(n))
    random.Random(seed).shuffle(idxs)
    test_n = int(n * test_split)
    val_n = int(n * val_split)
    test_idxs = idxs[:test_n]
    val_idxs = idxs[test_n:test_n + val_n]
    train_idxs = idxs[test_n + val_n:]
    return train_idxs, val_idxs, test_idxs

# ========= Transforms =========
val_test_tfms = transforms.Compose([
    transforms.Resize((260, 260)),
    transforms.CenterCrop(260),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# ========= Model builder =========
def build_efficientnet(num_classes: int, version: str = "b2"):
    if version == "b0":
        model = models.efficientnet_b0(weights=None)
    elif version == "b2":
        model = models.efficientnet_b2(weights=None)
    else:
        raise ValueError("Unsupported version")
    
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

# ========= Testing function =========
def test_task_model(task_name: str, model_version: str = "b2"):
    print(f"\n{'='*80}")
    print(f"Testing {task_name} ({model_version})")
    print(f"{'='*80}")
    
    cfg = TASKS[task_name]
    include = cfg["include"]
    label_map = cfg["map"]
    class_names = cfg["class_names"]
    num_classes = len(class_names)

    # Build full dataset and split
    full_ds = FilteredImageDataset(DATA_DIR, include, label_map, tfm=val_test_tfms)
    n = len(full_ds)
    _, _, test_idx = split_indices(n, VAL_SPLIT, TEST_SPLIT, SEED)

    test_ds = FilteredImageDataset(DATA_DIR, include, label_map, tfm=val_test_tfms, subset_indices=test_idx)
    print(f"Test set size: {len(test_ds)}")

    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False)

    # Load checkpoint
    ckpt_path = os.path.join(RESULTS_DIR, f"efficientnet_{model_version}_{task_name}.pth")
    if not os.path.exists(ckpt_path):
        print(f"❌ Model not found: {ckpt_path}")
        return None
    
    ckpt = torch.load(ckpt_path, map_location=DEVICE)
    
    model = build_efficientnet(num_classes, version=model_version).to(DEVICE)
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    # Detailed tracking
    all_labels = []
    all_preds = []
    all_probs = []
    per_original_class = defaultdict(lambda: {"correct": 0, "total": 0, "predictions": []})
    
    sample_predictions = []

    with torch.no_grad():
        for x, y, paths, orig_classes in test_loader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            logits = model(x)
            probs = torch.softmax(logits, dim=1)
            preds = logits.argmax(1)
            
            # Track overall metrics
            all_labels.extend(y.cpu().numpy().tolist())
            all_preds.extend(preds.cpu().numpy().tolist())
            all_probs.extend(probs.cpu().numpy().tolist())
            
            # Track per original class
            for i in range(len(y)):
                orig_class = orig_classes[i]
                true_label = y[i].item()
                pred_label = preds[i].item()
                prob_dist = probs[i].cpu().numpy()
                
                per_original_class[orig_class]["total"] += 1
                if pred_label == true_label:
                    per_original_class[orig_class]["correct"] += 1
                
                per_original_class[orig_class]["predictions"].append({
                    "true": class_names[true_label],
                    "pred": class_names[pred_label],
                    "probs": {class_names[j]: float(prob_dist[j]) for j in range(num_classes)}
                })
                
                # Collect some sample predictions
                if len(sample_predictions) < 10:
                    sample_predictions.append({
                        "path": paths[i],
                        "original_class": orig_class,
                        "true_label": class_names[true_label],
                        "predicted_label": class_names[pred_label],
                        "confidence": float(prob_dist[pred_label]),
                        "all_probs": {class_names[j]: float(prob_dist[j]) for j in range(num_classes)}
                    })

    # Overall metrics
    cm = confusion_matrix(all_labels, all_preds)
    report = classification_report(all_labels, all_preds, target_names=class_names)
    
    overall_acc = sum(1 for t, p in zip(all_labels, all_preds) if t == p) / len(all_labels) * 100.0
    
    print(f"\n📊 Overall Test Accuracy: {overall_acc:.2f}%")
    print(f"\n📋 Classification Report:")
    print(report)
    print(f"\n🔢 Confusion Matrix:")
    print(f"    Predicted: {class_names}")
    print(f"    True labels (rows):")
    for i, row_name in enumerate(class_names):
        print(f"    {row_name:15s}: {cm[i]}")
    
    # Per original class breakdown
    print(f"\n📦 Performance by Original Dataset Class:")
    for orig_class in sorted(per_original_class.keys()):
        stats = per_original_class[orig_class]
        acc = stats["correct"] / stats["total"] * 100.0 if stats["total"] > 0 else 0
        print(f"  {orig_class:20s}: {stats['correct']:4d}/{stats['total']:4d} correct ({acc:.1f}%)")
    
    # Sample predictions
    print(f"\n🔍 Sample Predictions:")
    for i, sample in enumerate(sample_predictions[:5], 1):
        is_correct = "✅" if sample["true_label"] == sample["predicted_label"] else "❌"
        print(f"  {i}. {is_correct} {os.path.basename(sample['path'])}")
        print(f"     Original class: {sample['original_class']}")
        print(f"     True: {sample['true_label']} | Predicted: {sample['predicted_label']} ({sample['confidence']:.2%})")
        print(f"     Probabilities: {sample['all_probs']}")
    
    return {
        "task": task_name,
        "overall_accuracy": overall_acc,
        "per_class_accuracy": {k: v["correct"] / v["total"] * 100.0 if v["total"] > 0 else 0 
                               for k, v in per_original_class.items()},
        "confusion_matrix": cm.tolist(),
        "class_names": class_names,
        "sample_predictions": sample_predictions[:10]
    }

# ========= Main =========
if __name__ == "__main__":
    print(f"Device: {DEVICE}")
    print(f"PyTorch version: {torch.__version__}")
    
    results = {}
    
    # Test all models
    for task in ["normal_abnormal", "precancer_cancer", "benign_malignant"]:
        result = test_task_model(task, model_version="b2")
        if result:
            results[task] = result
    
    # Save results
    output_file = "comprehensive_test_results.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n{'='*80}")
    print(f"✅ All tests completed. Results saved to {output_file}")
    print(f"{'='*80}")
