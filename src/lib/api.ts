import { DiagnosisResult, DiagnosisClass, DiagnosisStage, RiskLevel, UrgencyLevel } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/predict`;

// Map backend classes to frontend DiagnosisClass
const CLASS_MAPPING: Record<string, DiagnosisClass> = {
    'Normal': 'Normal',
    'benign_lesions': 'Benign',
    'lichen_planus': 'Precancerous',
    'Oral_Cancer': 'Cancerous'
};

const EXPLANATIONS: Record<DiagnosisClass, string> = {
    Normal: 'The AI analysis indicates healthy oral tissue with no detectable abnormalities. The tissue appears to have normal color, texture, and structural characteristics.',
    Benign: 'A benign lesion has been detected. These are typically non-cancerous growths. Clinical correlation is recommended to confirm.',
    Precancerous: 'Characteristics resembling potentially precancerous conditions (e.g., Lichen Planus) were detected. Detailed clinical examination and follow-up are advised.',
    Cancerous: 'The analysis flagged patterns consistent with malignancy (Oral Cancer). Immediate specialist referral and biopsy are strongly recommended.'
};

export async function analyzeImage(imageBlob: Blob): Promise<{ diagnosis: DiagnosisResult; gradCamImage?: string }> {
    const formData = new FormData();
    formData.append('file', imageBlob, 'image.jpg');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let details = '';
            try {
                const errBody = await response.json();
                details = errBody?.error || JSON.stringify(errBody);
            } catch {
                details = response.statusText;
            }
            throw new Error(`Server error (${response.status}): ${details}`);
        }

        const data = await response.json();
        if (!data || !data.prediction || data.confidence === undefined) {
            throw new Error('Unexpected response from model server.');
        }

        const backendClass = data.prediction;
        const confidence = data.confidence * 100; // Convert 0-1 to 0-100

        let predictedClass = CLASS_MAPPING[backendClass];
        if (!predictedClass) {
            predictedClass = (backendClass.charAt(0).toUpperCase() + backendClass.slice(1)) as DiagnosisClass;
        }

        const gradCamImage = data.gradCamImage;

        // Map other fields based on class
        let stage: DiagnosisStage = 'Normal';
        let riskLevel: RiskLevel = 'Low';
        let urgency: UrgencyLevel = 'Routine';
        let nextSteps: string[] = [];

        if (predictedClass === 'Normal') {
            stage = 'Normal';
            riskLevel = 'Low';
            urgency = 'Routine';
            nextSteps = ['Routine dental hygiene', 'Regular screening'];
        } else if (predictedClass === 'Benign') {
            stage = 'Benign';
            riskLevel = 'Low';
            urgency = 'Routine';
            nextSteps = ['Monitor for changes', 'Clinical verification'];
        } else if (predictedClass === 'Precancerous') {
            stage = 'Precancer';
            riskLevel = 'Moderate';
            urgency = 'Follow-Up';
            nextSteps = ['Schedule follow-up', 'Consider biopsy', 'Identify irritants'];
        } else if (predictedClass === 'Cancerous') {
            stage = 'Cancer';
            riskLevel = 'High';
            urgency = 'Immediate';
            nextSteps = ['Urgent referral', 'Biopsy', 'CT/MRI imaging'];
        }

        // Map probabilities to the breakdown stats
        const probs = data.probabilities || {};
        const pNormal = (probs['Normal'] || 0) * 100;
        const pBenign = (probs['benign_lesions'] || 0) * 100;
        const pLichen = (probs['lichen_planus'] || 0) * 100;
        const pCancer = (probs['Oral_Cancer'] || 0) * 100;

        // 1. Normal vs Abnormal
        const normalVsAbnormal = {
            normal: pNormal,
            abnormal: pBenign + pLichen + pCancer
        };

        // 2. Benign vs Malignant (Normalized relative to all non-normal findings)
        const totalAbnormal = pBenign + pLichen + pCancer;
        const benignVsMalignant = totalAbnormal > 0 ? {
            benign: (pBenign / totalAbnormal) * 100,
            malignant: ((pLichen + pCancer) / totalAbnormal) * 100
        } : { benign: 100, malignant: 0 };

        // 3. Precancer vs Cancer (Normalized relative to each other)
        const totalPC = pLichen + pCancer;
        const precancerVsCancer = totalPC > 0 ? {
            precancer: (pLichen / totalPC) * 100,
            cancer: (pCancer / totalPC) * 100
        } : { precancer: 100, cancer: 0 };

        // Differential diagnosis
        const differentialDiagnosis = Object.entries(probs)
            .map(([cls, prob]) => {
                const humanName = CLASS_MAPPING[cls] || cls;
                return {
                    condition: humanName,
                    probability: Number(prob)
                };
            })
            .sort((a, b) => b.probability - a.probability);

        return {
            diagnosis: {
                id: crypto.randomUUID(),
                predictedClass,
                confidence,
                stage,
                riskLevel,
                urgency,
                normalVsAbnormal,
                benignVsMalignant,
                precancerVsCancer,
                explanation: EXPLANATIONS[predictedClass],
                nextSteps,
                differentialDiagnosis,
                timestamp: new Date()
            },
            gradCamImage
        };

    } catch (error) {
        console.error("Analysis failed:", error);
        throw error;
    }
}
