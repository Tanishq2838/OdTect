import os
import random

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from PIL import Image
import numpy as np

# ========= Config (same as train.py) =========
DATA_DIR = "datasets"        # root: Normal, Oral_Cancer, benign_lesions, lichen_planus
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

# ========= Task config (same as train.py) =========
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

# ========= Dataset wrapper (same as train.py) =========
class FilteredImageDataset(Dataset):
    def __init__(self, data_dir, include_folders, label_map, tfm=None, subset_indices=None):
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

def split_indices(n, val_split, test_split, seed=42):
    idxs = list(range(n))
    random.Random(seed).shuffle(idxs)
    test_n = int(n * test_split)
    val_n = int(n * val_split)
    test_idxs = idxs[:test_n]
    val_idxs = idxs[test_n:test_n + val_n]
    train_idxs = idxs[test_n + val_n:]
    return train_idxs, val_idxs, test_idxs

# ========= Transforms (val/test) =========
val_test_tfms = transforms.Compose([
    transforms.Resize((260, 260)),
    transforms.CenterCrop(260),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# ========= EfficientNet-B2 builder =========
def build_efficientnet(num_classes: int):
    model = models.efficientnet_b2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

# ========= Accuracy checker for one task =========
def check_accuracy_for_task(task_name: str):
    cfg = TASKS[task_name]
    include = cfg["include"]
    label_map = cfg["map"]
    class_names = cfg["class_names"]
    num_classes = len(class_names)

    # Build full dataset and split exactly like training
    full_ds = FilteredImageDataset(DATA_DIR, include, label_map, tfm=val_test_tfms)
    n = len(full_ds)
    _, _, test_idx = split_indices(n, VAL_SPLIT, TEST_SPLIT, SEED)

    test_ds = FilteredImageDataset(DATA_DIR, include, label_map, tfm=val_test_tfms, subset_indices=test_idx)
    print(f"[{task_name}] Test set size: {len(test_ds)}")

    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False)

    # Load checkpoint saved by training code
    ckpt_path = os.path.join(RESULTS_DIR, f"efficientnet_b2_{task_name}.pth")
    ckpt = torch.load(ckpt_path, map_location=DEVICE)

    model = build_efficientnet(num_classes).to(DEVICE)
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    correct = 0
    total = 0

    with torch.no_grad():
        for x, y, _ in test_loader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            logits = model(x)
            preds = logits.argmax(1)
            correct += (preds == y).sum().item()
            total += y.size(0)

    acc = correct / total * 100.0
    print(f"✅ Overall Test Accuracy for {task_name} ({class_names}): {acc:.2f}%")

if __name__ == "__main__":
    check_accuracy_for_task("normal_abnormal")
    check_accuracy_for_task("precancer_cancer")
    check_accuracy_for_task("benign_malignant")
