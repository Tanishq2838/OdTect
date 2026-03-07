import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
RESULTS_DIR = "results"

TASKS = {
    "normal_abnormal": {
        "class_names": ["Normal", "Abnormal"],
        "checkpoint": "efficientnet_b2_normal_abnormal.pth",
    },
    "precancer_cancer": {
        "class_names": ["PreCancer", "Cancer"],
        "checkpoint": "efficientnet_b2_precancer_cancer.pth",
    },
    "benign_malignant": {
        "class_names": ["Benign", "Malignant"],
        "checkpoint": "efficientnet_b2_benign_malignant.pth",
    },
}

infer_tfms = transforms.Compose([
    transforms.Resize((260, 260)),
    transforms.CenterCrop(260),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

def build_efficientnet(num_classes: int):
    model = models.efficientnet_b2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

def load_model_for_task(task_name: str):
    cfg = TASKS[task_name]
    class_names = cfg["class_names"]
    num_classes = len(class_names)
    ckpt_path = os.path.join(RESULTS_DIR, cfg["checkpoint"])

    ckpt = torch.load(ckpt_path, map_location=DEVICE)
    model = build_efficientnet(num_classes).to(DEVICE)
    model.load_state_dict(ckpt["model_state"])
    model.eval()
    return model, class_names

def predict_image(image_path: str, task_name: str):
    model, class_names = load_model_for_task(task_name)

    img = Image.open(image_path).convert("RGB")
    x = infer_tfms(img).unsqueeze(0).to(DEVICE)  # shape [1, 3, H, W]

    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)[0]

    conf, pred_idx = torch.max(probs, dim=0)
    pred_class = class_names[pred_idx.item()]
    prob_dict = {cls: float(probs[i].item()) for i, cls in enumerate(class_names)}
    return pred_class, float(conf.item()), prob_dict

if __name__ == "__main__":
    # 1) Put your test image in the project folder, e.g. "test_image.jpg"
    image_path = "test_image.jpg"  # change this if needed

    if not os.path.isfile(image_path):
        print("Image not found:", image_path)
        raise SystemExit

    print("Running predictions for:", image_path)
    for task in ["normal_abnormal", "precancer_cancer", "benign_malignant"]:
        try:
            pred, conf, probs = predict_image(image_path, task)
            print(f"\nTask: {task}")
            print(f"Predicted: {pred} (confidence: {conf*100:.2f}%)")
            for cls, p in probs.items():
                print(f"  {cls}: {p*100:.2f}%")
        except FileNotFoundError:
            print(f"\nTask: {task}")
            print("  ❌ Checkpoint file not found for this task.")
