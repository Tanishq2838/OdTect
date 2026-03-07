import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import os
from collections import Counter

# Config
# Adjust paths for script execution from root
DATA_DIR = "mlproject/datasets"
MODEL_PATH = "mlproject/efficientnet_b0_oral_disease.pth"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Architecture (from server.py)
def build_efficientnet(num_classes: int, version: str = "b0") -> nn.Module:
    if version == "b0":
        model = models.efficientnet_b0(weights=None)
    elif version == "b2":
        model = models.efficientnet_b2(weights=None)
    else:
        raise ValueError("Unsupported version")
    
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

# Transforms (from server.py)
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

def verify():
    print(f"Checking model: {MODEL_PATH}")
    
    # Load Model
    try:
        checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
        
        if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
            state_dict = checkpoint['model_state_dict']
        else:
            state_dict = checkpoint

        # Infer num_classes
        if "classifier.1.weight" in state_dict:
            num_classes = state_dict["classifier.1.weight"].shape[0]
        elif "module.classifier.1.weight" in state_dict:
            num_classes = state_dict["module.classifier.1.weight"].shape[0]
            new_state_dict = {}
            for k, v in state_dict.items():
                name = k[7:] if k.startswith('module.') else k
                new_state_dict[name] = v
            state_dict = new_state_dict
        else:
            num_classes = 4 # Fallback
            
        print(f"Num classes: {num_classes}")
        
        model = build_efficientnet(num_classes, version="b0")
        model.load_state_dict(state_dict)
        model.to(DEVICE)
        model.eval()
        
    except Exception as e:
        print(f"Failed to load model: {e}")
        return

    # Check datasets
    folders = [d for d in os.listdir(DATA_DIR) if os.path.isdir(os.path.join(DATA_DIR, d))]
    print(f"Found folders in {DATA_DIR}: {folders}")
    
    mapping_results = {}
    
    for folder in folders:
        folder_path = os.path.join(DATA_DIR, folder)
        files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        # Test up to 10 images
        sample_files = files[:10]
        preds = []
        
        for f in sample_files:
            img_path = os.path.join(folder_path, f)
            try:
                img = Image.open(img_path).convert('RGB')
                tensor = transform(img).unsqueeze(0).to(DEVICE)
                
                with torch.no_grad():
                    logits = model(tensor)
                    pred_idx = torch.argmax(logits, dim=1).item()
                    preds.append(pred_idx)
            except Exception as e:
                print(f"Error processing {f}: {e}")
                
        if preds:
            most_common = Counter(preds).most_common(1)[0][0]
            print(f"Folder '{folder}' -> Most freq index: {most_common} (Counts: {Counter(preds)})")
            mapping_results[folder] = most_common
        else:
            print(f"Folder '{folder}' -> No images tested")

    print("\nFINAL MAPPING RESULTS:")
    sorted_map = sorted(mapping_results.items(), key=lambda x: x[1])
    for folder, idx in sorted_map:
        print(f"MAPPING: Folder '{folder}' is predicted as Index {idx}")
        
    final_list = [""] * num_classes
    for folder, idx in mapping_results.items():
        if 0 <= idx < num_classes:
            final_list[idx] = folder
            
    print(f"FINAL LIST: {final_list}")

if __name__ == "__main__":
    verify()
