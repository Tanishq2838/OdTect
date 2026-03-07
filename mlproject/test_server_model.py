"""
Test the main server model (4-class classifier) to identify issues
"""
import os
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import numpy as np
from collections import defaultdict
import json

# Device
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Class names from server
CLASS_NAMES = ['Normal', 'Oral_Cancer', 'benign_lesions', 'lichen_planus']

def build_efficientnet(num_classes: int, version: str = "b0"):
    if version == "b0":
        model = models.efficientnet_b0(weights=None)
    elif version == "b2":
        model = models.efficientnet_b2(weights=None)
    else:
        raise ValueError("Unsupported version")
    
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

# Load the server model
MODEL_PATH = "efficientnet_b0_oral_disease.pth"

print(f"Loading model from: {MODEL_PATH}")
checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)

# Extract state dict
if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
    state_dict = checkpoint['model_state_dict']
elif isinstance(checkpoint, dict) and 'model_state' in checkpoint:
    state_dict = checkpoint['model_state']
else:
    state_dict = checkpoint

# Normalize keys
if any(k.startswith('module.') for k in state_dict.keys()):
    state_dict = {k[7:] if k.startswith('module.') else k: v for k, v in state_dict.items()}

# Get num classes
num_classes = state_dict["classifier.1.weight"].shape[0]
print(f"Detected {num_classes} classes")

# Build and load model
model = build_efficientnet(num_classes, version="b0").to(DEVICE)
model.load_state_dict(state_dict)
model.eval()

print(f"Model loaded successfully")
print(f"Class names: {CLASS_NAMES}")

# Transforms
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# Test on sample images from each class
def test_images_from_folder(folder_path, true_class):
    """Test all images in a folder"""
    results = []
    
    if not os.path.exists(folder_path):
        print(f"❌ Folder not found: {folder_path}")
        return results
    
    image_files = []
    for root, _, files in os.walk(folder_path):
        for f in files:
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
                image_files.append(os.path.join(root, f))
    
    print(f"\n{'='*80}")
    print(f"Testing {len(image_files)} images from: {true_class}")
    print(f"{'='*80}")
    
    predictions_count = defaultdict(int)
    correct_count = 0
    
    for i, img_path in enumerate(image_files[:20]):  # Test first 20 images
        try:
            img = Image.open(img_path).convert('RGB')
            tensor = transform(img).unsqueeze(0).to(DEVICE)
            
            with torch.no_grad():
                logits = model(tensor)
                probs = torch.softmax(logits, dim=1)
                conf, pred_idx = torch.max(probs, 1)
                
                predicted_class = CLASS_NAMES[pred_idx.item()]
                confidence = conf.item()
                
                predictions_count[predicted_class] += 1
                is_correct = (predicted_class == true_class)
                if is_correct:
                    correct_count += 1
                
                result = {
                    "file": os.path.basename(img_path),
                    "true_class": true_class,
                    "predicted_class": predicted_class,
                    "confidence": confidence,
                    "correct": is_correct,
                    "all_probs": {CLASS_NAMES[j]: float(probs[0][j]) for j in range(num_classes)}
                }
                results.append(result)
                
                # Print first 5 and any errors
                if i < 5 or not is_correct:
                    status = "✅" if is_correct else "❌"
                    print(f"{status} {os.path.basename(img_path)[:50]:50s} | Pred: {predicted_class:20s} | Conf: {confidence:.2%} | True: {true_class}")
                    if not is_correct:
                        print(f"   Full probabilities: {result['all_probs']}")
        
        except Exception as e:
            print(f"❌ Error processing {img_path}: {e}")
    
    # Summary
    tested = min(20, len(image_files))
    accuracy = (correct_count / tested * 100) if tested > 0 else 0
    print(f"\n📊 Summary for {true_class}:")
    print(f"   Tested: {tested} images")
    print(f"   Correct: {correct_count}/{tested} ({accuracy:.1f}%)")
    print(f"   Prediction distribution:")
    for pred_class, count in sorted(predictions_count.items(), key=lambda x: -x[1]):
        print(f"      {pred_class:20s}: {count:3d} ({count/tested*100:.1f}%)")
    
    return results

# Test each class
all_results = {}
datasets_dir = "datasets"

for class_name in CLASS_NAMES:
    folder_path = os.path.join(datasets_dir, class_name)
    results = test_images_from_folder(folder_path, class_name)
    all_results[class_name] = results

# Save results
output_file = "server_model_test_results.json"
with open(output_file, "w") as f:
    json.dump(all_results, f, indent=2)

print(f"\n{'='*80}")
print(f"✅ Server model testing completed. Results saved to {output_file}")
print(f"{'='*80}")

# Overall summary
print(f"\n📊 OVERALL SUMMARY:")
total_tested = sum(len(results) for results in all_results.values())
total_correct = sum(sum(1 for r in results if r['correct']) for results in all_results.values())
overall_accuracy = (total_correct / total_tested * 100) if total_tested > 0 else 0
print(f"Total images tested: {total_tested}")
print(f"Total correct: {total_correct}")
print(f"Overall accuracy: {overall_accuracy:.2f}%")
