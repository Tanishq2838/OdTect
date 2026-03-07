export type DiagnosisClass = 'Normal' | 'Benign' | 'Precancerous' | 'Cancerous';

export interface PatientDetails {
  patientName: string;
  patientId: string;
  age: string;
  gender: string;
  examinationDate: string;
  clinicalNotes: string;
}

export type DiagnosisStage = 'Normal' | 'Benign' | 'Precancer' | 'Cancer';
export type RiskLevel = 'Low' | 'Moderate' | 'High';
export type UrgencyLevel = 'Routine' | 'Follow-Up' | 'Immediate';

export interface DiagnosisResult {
  id: string;
  predictedClass: DiagnosisClass;
  confidence: number;
  stage: DiagnosisStage;
  riskLevel: RiskLevel;
  urgency: UrgencyLevel;
  normalVsAbnormal: { normal: number; abnormal: number };
  benignVsMalignant: { benign: number; malignant: number };
  precancerVsCancer: { precancer: number; cancer: number };
  explanation: string;
  nextSteps: string[];
  differentialDiagnosis: { condition: string; probability: number }[];
  timestamp: Date;
}

export interface CaseRecord {
  id: string;
  patientDetails: PatientDetails;
  originalImage: string;
  gradCamImage: string;
  diagnosis: DiagnosisResult;
  createdAt: Date;
}
