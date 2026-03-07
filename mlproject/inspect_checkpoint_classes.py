import torch
import os

MODEL_PATH = os.path.join("results", "best_model.pth")
if os.path.exists(MODEL_PATH):
    checkpoint = torch.load(MODEL_PATH, map_location="cpu")
    if isinstance(checkpoint, dict):
        print("Checkpoint is a dictionary.")
        if "class_names" in checkpoint:
            print(f"CLASS_NAMES in checkpoint: {checkpoint['class_names']}")
        else:
            print("No 'class_names' key found in checkpoint.")
        
        if "model_state" in checkpoint:
            print("Model state dict found.")
        else:
            print("No 'model_state' key found.")
    else:
        print("Checkpoint is a direct state_dict.")
else:
    print(f"Model path {MODEL_PATH} not found.")
