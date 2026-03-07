import torch
import os
import torch.nn as nn
from torchvision import models

def build_efficientnet(num_classes: int, version: str = "b2"):
    if version == "b2":
        model = models.efficientnet_b2(weights=None)
    else:
        model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

MODEL_PATH = os.path.join("results", "best_model.pth")
output_file = "model_diagnosis.txt"

with open(output_file, "w") as f:
    try:
        f.write(f"Checking {MODEL_PATH}...\n")
        checkpoint = torch.load(MODEL_PATH, map_location="cpu")
        f.write("Checkpoint loaded successfully\n")
        
        # Test B2 with 4 classes
        f.write("\nAttempting to load into B2 architecture with 4 classes...\n")
        try:
            model = build_efficientnet(4, version="b2")
            if isinstance(checkpoint, dict) and "model_state" in checkpoint:
                model.load_state_dict(checkpoint["model_state"])
            else:
                model.load_state_dict(checkpoint)
            f.write("✅ SUCCESS: Loaded into B2 with 4 classes\n")
        except Exception as e:
            f.write(f"❌ FAILED: {str(e)}\n")
            
        # Test B0 with 4 classes
        f.write("\nAttempting to load into B0 architecture with 4 classes...\n")
        try:
            model = build_efficientnet(4, version="b0")
            if isinstance(checkpoint, dict) and "model_state" in checkpoint:
                model.load_state_dict(checkpoint["model_state"])
            else:
                model.load_state_dict(checkpoint)
            f.write("✅ SUCCESS: Loaded into B0 with 4 classes\n")
        except Exception as e:
            f.write(f"❌ FAILED: {str(e)}\n")

        # Inspect checkpoint keys and sizes
        f.write("\nCheckpoint Keys and Sizes:\n")
        if isinstance(checkpoint, dict) and "model_state" in checkpoint:
            state = checkpoint["model_state"]
        else:
            state = checkpoint
        
        for k, v in list(state.items())[:10]: # First 10 keys
            f.write(f"{k}: {v.shape}\n")
        f.write(f"...\n")
        # Check classifier size
        clf_keys = [k for k in state.keys() if "classifier" in k]
        for k in clf_keys:
            f.write(f"{k}: {state[k].shape}\n")

    except Exception as e:
        f.write(f"CRITICAL ERROR: {str(e)}\n")
        import traceback
        f.write(traceback.format_exc())
