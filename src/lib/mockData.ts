import { DiagnosisClass, DiagnosisResult, DiagnosisStage, RiskLevel, UrgencyLevel } from './types';

const explanations: Record<DiagnosisClass, string> = {
  Normal: 'The AI analysis indicates healthy oral tissue with no detectable abnormalities. The tissue appears to have normal color, texture, and structural characteristics consistent with healthy oral mucosa.',
  Benign: 'A benign lesion has been detected. While this finding is non-cancerous, clinical monitoring is recommended. The lesion shows characteristics typical of benign growths such as regular borders and uniform coloration.',
  Precancerous: 'Potentially precancerous changes have been identified. This finding suggests dysplastic changes that may progress if left untreated. Further clinical evaluation and possible biopsy are strongly recommended.',
  Cancerous: 'The AI analysis indicates characteristics consistent with malignancy. Immediate clinical evaluation, biopsy, and specialist referral are strongly recommended. Early intervention is critical for optimal outcomes.',
};

export function generateMockDiagnosis(): DiagnosisResult {
  const classes: DiagnosisClass[] = ['Normal', 'Benign', 'Precancerous', 'Cancerous'];
  // Weight the random generation slightly towards abnormal for demonstration purposes
  const predictedClass = Math.random() > 0.3
    ? classes[Math.floor(Math.random() * (classes.length - 1)) + 1]
    : 'Normal';

  const baseConfidence = 75 + Math.random() * 20;

  let normalVsAbnormal = { normal: 0, abnormal: 0 };
  let benignVsMalignant = { benign: 0, malignant: 0 };
  let precancerVsCancer = { precancer: 0, cancer: 0 };

  // Clinical Data Generation
  let stage: DiagnosisStage = 'Normal';
  let riskLevel: RiskLevel = 'Low';
  let urgency: UrgencyLevel = 'Routine';
  let nextSteps: string[] = [];
  let differentialDiagnosis: { condition: string; probability: number }[] = [];

  switch (predictedClass) {
    case 'Normal':
      stage = 'Normal';
      riskLevel = 'Low';
      urgency = 'Routine';
      normalVsAbnormal = { normal: 85 + Math.random() * 10, abnormal: 5 + Math.random() * 10 };
      benignVsMalignant = { benign: 90 + Math.random() * 5, malignant: 5 + Math.random() * 5 };
      precancerVsCancer = { precancer: 50, cancer: 50 };

      nextSteps = [
        'Routine dental hygiene maintenance',
        'Regular annual screening',
        'Patient education on oral self-examination'
      ];
      differentialDiagnosis = [
        { condition: 'Healthy Mucosa', probability: 0.92 },
        { condition: 'Fordyce Granules', probability: 0.05 },
        { condition: 'Linea Alba', probability: 0.03 }
      ];
      break;

    case 'Benign':
      stage = 'Benign';
      riskLevel = 'Low';
      urgency = 'Routine';
      normalVsAbnormal = { normal: 20 + Math.random() * 15, abnormal: 65 + Math.random() * 15 };
      benignVsMalignant = { benign: 80 + Math.random() * 15, malignant: 5 + Math.random() * 15 };
      precancerVsCancer = { precancer: 50, cancer: 50 };

      nextSteps = [
        'Monitor for size/color changes in 6 months',
        'Photograph lesion for records',
        'Reassure patient of benign nature'
      ];
      differentialDiagnosis = [
        { condition: 'Fibroma', probability: 0.65 },
        { condition: 'Papilloma', probability: 0.25 },
        { condition: 'Hemangioma', probability: 0.10 }
      ];
      break;

    case 'Precancerous':
      stage = 'Precancer';
      riskLevel = 'Moderate';
      urgency = 'Follow-Up';
      normalVsAbnormal = { normal: 5 + Math.random() * 10, abnormal: 85 + Math.random() * 10 };
      benignVsMalignant = { benign: 25 + Math.random() * 15, malignant: 60 + Math.random() * 15 };
      precancerVsCancer = { precancer: 70 + Math.random() * 20, cancer: 10 + Math.random() * 20 };

      nextSteps = [
        'Schedule follow-up appointment in 2 weeks',
        'Consider brush biopsy or incisional biopsy',
        'Identify and remove potential irritants',
        'Tobacco/Alcohol cessation counseling'
      ];
      differentialDiagnosis = [
        { condition: 'Leukoplakia', probability: 0.55 },
        { condition: 'Lichen Planus', probability: 0.30 },
        { condition: 'Erythroplakia', probability: 0.15 }
      ];
      break;

    case 'Cancerous':
      stage = 'Cancer';
      riskLevel = 'High';
      urgency = 'Immediate';
      normalVsAbnormal = { normal: 2 + Math.random() * 5, abnormal: 93 + Math.random() * 5 };
      benignVsMalignant = { benign: 5 + Math.random() * 10, malignant: 85 + Math.random() * 10 };
      precancerVsCancer = { precancer: 15 + Math.random() * 10, cancer: 75 + Math.random() * 15 };

      nextSteps = [
        'Urgent referral to Oral/Maxillofacial Surgeon or Oncologist',
        'Immediate histopathological verification (Biopsy)',
        'CT/MRI imaging for extent evaluation',
        'Patient support and counseling'
      ];
      differentialDiagnosis = [
        { condition: 'Squamous Cell Carcinoma', probability: 0.82 },
        { condition: 'Verrucous Carcinoma', probability: 0.12 },
        { condition: 'Deep Fungal Infection', probability: 0.06 }
      ];
      break;
  }

  return {
    id: crypto.randomUUID(),
    predictedClass,
    confidence: Math.round(baseConfidence * 10) / 10,
    stage,
    riskLevel,
    urgency,
    normalVsAbnormal,
    benignVsMalignant,
    precancerVsCancer,
    nextSteps,
    differentialDiagnosis,
    explanation: explanations[predictedClass],
    timestamp: new Date(),
  };
}

// Generate a simple gradient overlay to simulate Grad-CAM
export function generateGradCamOverlay(originalImage: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Create heatmap overlay
      const centerX = canvas.width * (0.3 + Math.random() * 0.4);
      const centerY = canvas.height * (0.3 + Math.random() * 0.4);
      const radius = Math.min(canvas.width, canvas.height) * (0.2 + Math.random() * 0.2);

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)');
      gradient.addColorStop(0.3, 'rgba(255, 165, 0, 0.5)');
      gradient.addColorStop(0.6, 'rgba(255, 255, 0, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = originalImage;
  });
}
