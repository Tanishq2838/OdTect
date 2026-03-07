import os
import hashlib
import shutil
from PIL import Image
from sklearn.model_selection import train_test_split

# Your actual class folders
CLASSES = ["Normal", "lichen_planus", "benign_lesions", "Oral_Cancer"]

DATASET_DIR = "datasets"
OUTPUT_DIR = "datasets_split"
IMG_SIZE = (224, 224)

# Step 1: Remove duplicate images
def remove_duplicates():
    print("🔍 Removing duplicates...")
    seen = {}
    for cls in CLASSES:
        folder = os.path.join(DATASET_DIR, cls)
        for file in os.listdir(folder):
            path = os.path.join(folder, file)
            if not os.path.isfile(path):
                continue
            with open(path, "rb") as f:
                h = hashlib.md5(f.read()).hexdigest()
            if h in seen:
                print(f"❌ Duplicate removed: {path}")
                os.remove(path)
            else:
                seen[h] = path

# Step 2: Check for corrupted files
def check_corrupted():
    print("🧪 Checking for corrupted files...")
    for cls in CLASSES:
        folder = os.path.join(DATASET_DIR, cls)
        for file in os.listdir(folder):
            path = os.path.join(folder, file)
            try:
                Image.open(path).verify()
            except Exception:
                print(f"⚠️ Corrupted file removed: {path}")
                os.remove(path)

# Step 3: Resize images to 224x224
def resize_images():
    print("📐 Resizing images...")
    for cls in CLASSES:
        folder = os.path.join(DATASET_DIR, cls)
        for file in os.listdir(folder):
            path = os.path.join(folder, file)
            try:
                img = Image.open(path).convert("RGB")
                img = img.resize(IMG_SIZE)
                img.save(path)
            except Exception as e:
                print(f"⚠️ Error resizing {path}: {e}")

# Step 4: Split into train/val/test
def split_dataset():
    print("📂 Splitting dataset...")
    for cls in CLASSES:
        folder = os.path.join(DATASET_DIR, cls)
        files = [os.path.join(folder, f) for f in os.listdir(folder)]
        
        train, temp = train_test_split(files, test_size=0.3, random_state=42)
        val, test = train_test_split(temp, test_size=0.5, random_state=42)

        for split_name, split_files in zip(["train", "val", "test"], [train, val, test]):
            split_folder = os.path.join(OUTPUT_DIR, split_name, cls)
            os.makedirs(split_folder, exist_ok=True)
            for f in split_files:
                shutil.copy(f, split_folder)

if __name__ == "__main__":
    remove_duplicates()
    check_corrupted()
    resize_images()
    split_dataset()
    print("✅ Preprocessing complete! Check 'datasets_split/' for train/val/test folders.")
