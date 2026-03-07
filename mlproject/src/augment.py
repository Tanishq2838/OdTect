import os
import cv2
import albumentations as A

CLASSES = ["Normal", "lichen_planus", "benign_lesions", "Oral_Cancer"]
DATASET_DIR = "datasets"

# Define augmentation pipeline
augmenter = A.Compose([
    A.HorizontalFlip(p=0.5),
    A.Rotate(limit=15, p=0.5),
    A.RandomBrightnessContrast(p=0.5),
    A.Blur(blur_limit=3, p=0.3)
])

AUG_PER_IMAGE = 3

def augment_images():
    for cls in CLASSES:
        folder = os.path.join(DATASET_DIR, cls)
        files = os.listdir(folder)
        print(f"📂 Augmenting {cls} ({len(files)} original images)...")
        
        for file in files:
            path = os.path.join(folder, file)
            img = cv2.imread(path)
            if img is None:
                continue
            for i in range(AUG_PER_IMAGE):
                augmented = augmenter(image=img)["image"]
                new_name = f"{os.path.splitext(file)[0]}_aug{i}.jpg"
                cv2.imwrite(os.path.join(folder, new_name), augmented)

if __name__ == "__main__":
    augment_images()
    print("✅ Augmentation complete! Extra images saved in original class folders.")
