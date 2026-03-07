import torch
import os

path = r"c:\Users\annam\OneDrive\Desktop\oral-clarity-ai-main\oral-clarity-ai-main - Copy\oral-clarity-ai-main\mlproject\efficientnet_b0_oral_disease.pth"

try:
    if not os.path.exists(path):
        print(f"File not found: {path}")
        exit(1)

    print(f"Loading {path}...")
    # Map to cpu
    state = torch.load(path, map_location=torch.device('cpu'))
    
    if isinstance(state, dict):
        print("Keys in checkpoint:", state.keys())
        if 'class_names' in state:
            print("Class names found:", state['class_names'])
        if 'model_state' in state:
            print("Model state found.")
            # detailed check of first layer to guess arch if possible, but B0 vs B2 ...
            # keys usually start with 'features.0.0...'
        elif 'state_dict' in state:
             print("State dict found.")
        else:
             # Just a state dict?
             print("Assuming raw state dict.")
             # print first few keys
             print(list(state.keys())[:5])
    else:
        print("Checkpoint is not a dict?")

except Exception as e:
    print(f"Error loading checkpoint: {e}")
