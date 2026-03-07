"""
Comprehensive test of the intelligent ensemble model
"""
import os
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import numpy as np
from collections import defaultdict
import json

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
RESULTS_DIR = "results"

# Class names
CLASS_NAMES = ['Normal', 'Oral_Cancer', 'benign_lesions', 'lichen_planus']

# ========= Model Architecture =========
def build_efficientnet(num_classes: int, version: str = "b2"):
    if version == "b2":
        model = models.efficientnet_b2(weights=None)
    else:
        raise ValueError("Unsupported version")
    
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

# ========= Load Models =========
print("Loading models...")
model_normal_abnormal = build_efficientnet(2).to(DEVICE)
ckpt1 = torch.load(os.path.join(RESULTS_DIR, "efficientnet_b2_normal_abnormal.pth"), map_location=DEVICE)
model_normal_abnormal.load_state_dict(ckpt1["model_state"])
model_normal_abnormal.eval()

model_precancer_cancer = build_efficientnet(2).to(DEVICE)
ckpt2 = torch.load(os.path.join(RESULTS_DIR, "efficientnet_b2_precancer_cancer.pth"), map_location=DEVICE)
model_precancer_cancer.load_state_dict(ckpt2["model_state"])
model_precancer_cancer.eval()

model_benign_malignant = build_efficientnet(2).to(DEVICE)
ckpt3 = torch.load(os.path.join(RESULTS_DIR, "efficientnet_b2_benign_malignant.pth"), map_location=DEVICE)
model_benign_malignant.load_state_dict(ckpt3["model_state"])
model_benign_malignant.eval()

print("✅ All models loaded")

# ========= Transforms =========
transform = transforms.Compose([
    transforms.Resize((260, 260)),
    transforms.CenterCrop(260),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# ========= Ensemble Prediction =========
def predict_with_ensemble(image_tensor):
    """Intelligent ensemble prediction"""
    with torch.no_grad():
        # Step 1: Normal vs Abnormal
        logits1 = model_normal_abnormal(image_tensor)
        probs1 = torch.softmax(logits1, dim=1)
        
        is_normal = probs1[0][0].item()
        is_abnormal = probs1[0][1].item()
        
        if is_normal > 0.5:
            return "Normal", is_normal, {
                "Normal": is_normal,
                "Oral_Cancer": is_abnormal * 0.33,
                "benign_lesions": is_abnormal * 0.33,
                "lichen_planus": is_abnormal * 0.34
            }
        else:
            # Step 2: Determine abnormality type
            logits2 = model_precancer_cancer(image_tensor)
            probs2 = torch.softmax(logits2, dim=1)
            prob_precancer = probs2[0][0].item()
            prob_cancer = probs2[0][1].item()
            
            logits3 = model_benign_malignant(image_tensor)
            probs3 = torch.softmax(logits3, dim=1)
            prob_benign = probs3[0][0].item()
            prob_malignant = probs3[0][1].item()
            
            # Combine intelligently
            oral_cancer_score = (prob_cancer * 0.5 + prob_malignant * 0.5)
            lichen_planus_score = prob_precancer * 0.9
            benign_score = prob_benign * 0.9
            
            total = oral_cancer_score + lichen_planus_score + benign_score
            oral_cancer_prob = oral_cancer_score / total
            lichen_planus_prob = lichen_planus_score / total
            benign_prob = benign_score / total
            
            scores = {
                "Oral_Cancer": oral_cancer_prob,
                "lichen_planus": lichen_planus_prob,
                "benign_lesions": benign_prob
            }
            
            final_prediction = max(scores, key=scores.get)
            confidence = scores[final_prediction]
            
            all_probs = {
                "Normal": is_normal,
                "Oral_Cancer": is_abnormal * oral_cancer_prob,
                "benign_lesions": is_abnormal * benign_prob,
                "lichen_planus": is_abnormal * lichen_planus_prob
            }
            
            return final_prediction, confidence, all_probs

# ========= Test Function =========
def test_ensemble_on_class(folder_path, true_class):
    """Test ensemble on images from a specific class"""
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
    
    for i, img_path in enumerate(image_files[:20]):
        try:
            img = Image.open(img_path).convert('RGB')
            tensor = transform(img).unsqueeze(0).to(DEVICE)
            
            predicted_class, confidence, all_probs = predict_with_ensemble(tensor)
            
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
                "all_probs": all_probs
            }
            results.append(result)
            
            if i < 5 or not is_correct:
                status = "✅" if is_correct else "❌"
                print(f"{status} {os.path.basename(img_path)[:50]:50s} | Pred: {predicted_class:20s} | Conf: {confidence:.2%}")
                if not is_correct:
                    print(f"   Probabilities: {all_probs}")
        
        except Exception as e:
            print(f"❌ Error processing {img_path}: {e}")
    
    tested = min(20, len(image_files))
    accuracy = (correct_count / tested * 100) if tested > 0 else 0
    print(f"\n📊 Summary for {true_class}:")
    print(f"   Tested: {tested} images")
    print(f"   Correct: {correct_count}/{tested} ({accuracy:.1f}%)")
    print(f"   Prediction distribution:")
    for pred_class, count in sorted(predictions_count.items(), key=lambda x: -x[1]):
        print(f"      {pred_class:20s}: {count:3d} ({count/tested*100:.1f}%)")
    
    return results

# ========= Main =========
if __name__ == "__main__":
    print(f"\n🧪 Testing Intelligent Ensemble Model")
    print(f"Device: {DEVICE}")
    
    all_results = {}
    datasets_dir = "datasets"
    
    for class_name in CLASS_NAMES:
        folder_path = os.path.join(datasets_dir, class_name)
        results = test_ensemble_on_class(folder_path, class_name)
        all_results[class_name] = results
    
    # Overall summary
    print(f"\n{'='*80}")
    print(f"📊 OVERALL ENSEMBLE PERFORMANCE:")
    print(f"{'='*80}")
    total_tested = sum(len(results) for results in all_results.values())
    total_correct = sum(sum(1 for r in results if r['correct']) for results in all_results.values())
    overall_accuracy = (total_correct / total_tested * 100) if total_tested > 0 else 0
    print(f"Total images tested: {total_tested}")
    print(f"Total correct: {total_correct}")
    print(f"Overall accuracy: {overall_accuracy:.2f}%")
    print(f"{'='*80}")
    
    # Save results
    output_file = "ensemble_test_results.json"
    with open(output_file, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"✅ Results saved to {output_file}")
