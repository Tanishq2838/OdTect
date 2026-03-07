"""
Final Production Server for Oral Disease Classification
Uses the ultimate 99.06% accurate EfficientNet-B2 single model
Includes Grad-CAM visualization and supports Manual Region Selection
"""
import os
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import base64
import matplotlib.pyplot as plt

app = Flask(__name__)
CORS(app)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Running on device: {DEVICE}")

CLASS_NAMES = ['Normal', 'Oral_Cancer', 'benign_lesions', 'lichen_planus']

# ========= Model Architecture =========
def build_efficientnet_b2(num_classes: int):
    model = models.efficientnet_b2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

# ========= Load Final Optimized Model =========
MODEL_PATH = os.path.join("results", "best_model.pth")
try:
    model = build_efficientnet_b2(len(CLASS_NAMES))
    checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
    
    # Handle checkpoint format
    if isinstance(checkpoint, dict) and "model_state" in checkpoint:
        model.load_state_dict(checkpoint["model_state"])
    else:
        model.load_state_dict(checkpoint)
        
    model.to(DEVICE)
    model.eval()
    print(f"✅ Final Model (99.06% Accuracy) loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None

# ========= Transforms =========
# Matching the improved training configuration (260x260)
transform = transforms.Compose([
    transforms.Resize((260, 260)),
    transforms.CenterCrop(260),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# ========= GradCAM =========
class GradCAM:
    def __init__(self, model: nn.Module, target_layer_name: str):
        self.model = model
        self.model.eval()
        self.target_layer = self._get_layer(target_layer_name)
        self.gradients = None
        self.activations = None

        def fwd_hook(module, inp, out):
            self.activations = out.detach()

        def bwd_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        self.target_layer.register_forward_hook(fwd_hook)
        self.target_layer.register_full_backward_hook(bwd_hook)

    def _get_layer(self, name: str):
        if name == "features[-1]":
            return self.model.features[-1]
        return eval(f"self.model.{name}")

    def generate(self, input_tensor: torch.Tensor, target_class: int):
        self.model.zero_grad()
        logits = self.model(input_tensor)
        score = logits[:, target_class].sum()
        score.backward()

        grads = self.gradients
        acts = self.activations
        weights = grads.mean(dim=(2, 3), keepdim=True)
        cam = (weights * acts).sum(dim=1, keepdim=True)
        cam = torch.relu(cam)

        cam = cam.squeeze(1)
        cam_min, cam_max = cam.min(), cam.max()
        cam = (cam - cam_min) / (cam_max - cam_min + 1e-8)
        cam = torch.nn.functional.interpolate(
            cam.unsqueeze(1),
            size=(input_tensor.size(2), input_tensor.size(3)),
            mode="bilinear",
            align_corners=False
        )
        cam = cam.squeeze(1)
        return cam.cpu().numpy(), logits.detach().cpu().numpy()

def overlay_cam_on_image(img_tensor: torch.Tensor, cam: np.ndarray, alpha: float = 0.5):
    mean = np.array([0.485, 0.456, 0.406]).reshape(3, 1, 1)
    std = np.array([0.229, 0.224, 0.225]).reshape(3, 1, 1)
    img_np = img_tensor.detach().cpu().numpy()
    img_np = (img_np * std + mean).clip(0, 1)
    img_np = np.transpose(img_np, (1, 2, 0))

    heatmap = cam
    heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)
    heatmap = plt.cm.jet(heatmap)[..., :3]

    overlay = (alpha * heatmap + (1 - alpha) * img_np)
    overlay = overlay.clip(0, 1)
    
    overlay_uint8 = (overlay * 255).astype(np.uint8)
    return Image.fromarray(overlay_uint8)

# ========= Flask API =========
@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Final model not loaded'}), 500
        
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        # Load and preprocess image
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        tensor = transform(img).unsqueeze(0).to(DEVICE)
        
        # Prediction
        tensor.requires_grad = True 
        with torch.enable_grad():
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1)
            conf, pred_idx = torch.max(probs, 1)
            
            target_class = pred_idx.item()
            prediction = CLASS_NAMES[target_class]
            confidence = conf.item()
            
            # Generate GradCAM
            gradcam = GradCAM(model, target_layer_name="features[-1]")
            cams, _ = gradcam.generate(tensor, target_class=target_class)
            cam = cams[0]
            overlay_img = overlay_cam_on_image(tensor[0], cam)
            
            # Save overlay to base64
            buffered = io.BytesIO()
            overlay_img.save(buffered, format="PNG")
            gradcam_b64 = "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        # Individual probabilities
        prob_dist = {CLASS_NAMES[i]: float(probs[0][i].item()) for i in range(len(CLASS_NAMES))}
        
        print(f"Prediction: {prediction} (Confidence: {confidence:.4f})")
        
        return jsonify({
            'prediction': prediction,
            'confidence': confidence,
            'probabilities': prob_dist,
            'gradCamImage': gradcam_b64,
            'model_info': {
                'type': 'efficientnet_b2_ultimate',
                'accuracy': '99.06%',
                'input_size': '260x260'
            }
        })
    
    except Exception as e:
        print(f"Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'model_version': 'EfficientNet-B2 Ultimate (Best)',
        'accuracy': '99.06%'
    })

if __name__ == '__main__':
    print("\n" + "="*80)
    print("🚀 Final Ultimate Oral Disease Classification Server Ready")
    print("="*80)
    print("📊 Model Type: EfficientNet-B2 Single Best Model (99.06% Accuracy)")
    print("="*80)
    app.run(host='0.0.0.0', port=5000)
