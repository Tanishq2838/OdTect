import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Calendar, CheckCircle2, AlertTriangle, Printer, Share2 } from 'lucide-react';
import DiagnosisBadge from '@/components/DiagnosisBadge';
import GradCAMViewer from '@/components/GradCAMViewer';
import ConfidenceBar from '@/components/ConfidenceBar';
import { Button } from '@/components/ui/button';
import { CaseRecord } from '@/lib/types';
import { getCaseById } from '@/lib/caseStorage';
import { generatePDFReport } from '@/lib/pdfGenerator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// New Clinical Components
import StageProgression from '@/components/clinical/StageProgression';
import RiskPanel from '@/components/clinical/RiskPanel';
import ActionPlan from '@/components/clinical/ActionPlan';
import DifferentialDiagnosis from '@/components/clinical/DifferentialDiagnosis';
import LimitationsCard from '@/components/clinical/LimitationsCard';

const CircularProgress = ({ value, label, subLabel }: { value: number, label: string, subLabel: string }) => {
  const radius = 45;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Background Circle */}
      <svg className="w-full h-full transform -rotate-90">
        <circle
          className="text-secondary"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="64"
          cy="64"
        />
        {/* Progress Circle */}
        <motion.circle
          className="text-primary"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="64"
          cy="64"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold text-foreground">{value.toFixed(2)}%</span>
        <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
};

export default function Results() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [liteMode, setLiteMode] = useState(false);

  const caseId = searchParams.get('id');

  useEffect(() => {
    if (caseId) {
      const record = getCaseById(caseId);
      if (record) {
        setCaseRecord(record);
      } else {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  }, [caseId, navigate]);

  const handleDownloadPDF = async () => {
    if (!caseRecord) return;
    setIsGeneratingPDF(true);
    try {
      await generatePDFReport(caseRecord);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!caseRecord) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
      </div>
    );
  }

  const { diagnosis, patientDetails } = caseRecord;
  const isHighPriority = diagnosis.urgency === 'Immediate' || diagnosis.riskLevel === 'High';

  return (
    <div className="space-y-8 pb-12">

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">
              Analysis Results: {patientDetails.patientName || 'Patient #49281'}
            </h1>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">New Result</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Session ID: {caseId?.slice(0, 8).toUpperCase()} | {new Date(caseRecord.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <Switch id="lite-mode" checked={liteMode} onCheckedChange={setLiteMode} />
            <Label htmlFor="lite-mode" className="text-sm text-muted-foreground">Lite Mode</Label>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? 'Generating...' : 'Generate Report'}
            <FileText className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: VISUALS (55%) */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
          {/* Main Visual Analysis */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6"
          >
            <GradCAMViewer
              originalImage={caseRecord.originalImage}
              gradCamImage={caseRecord.gradCamImage}
            />

            {/* Slider Disclaimer */}
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground bg-secondary/30 p-3 rounded-xl border border-secondary">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                AI-generated heatmap highlights regions of interest not definitive pathology.
              </span>
            </div>
          </motion.div>

          {/* Clinical Interpretation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 sm:p-8"
          >
            <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
              <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              Technical Interpretation
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The AI model provides high-resolution feature mapping consistent with <strong className="text-foreground">{diagnosis.predictedClass}</strong> tissue patterns.
              {diagnosis.explanation}
              <br /><br />
              The diagnostic evidence supports a classification of <strong className="text-foreground">{diagnosis.predictedClass}</strong> with a risk profile categorized as <strong className="text-foreground">{diagnosis.riskLevel}</strong>.
            </p>
          </motion.div>

          <LimitationsCard />
        </div>


        {/* RIGHT COLUMN: DIAGNOSIS & STATS (45%) */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">

          {/* Primary Diagnosis Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-primary/5"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="space-y-4 max-w-[60%]">
                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-1">AI Diagnostic Output</h4>
                  <h2 className="text-3xl font-bold font-heading text-foreground leading-tight">
                    {diagnosis.predictedClass}
                  </h2>
                </div>
                <DiagnosisBadge diagnosis={diagnosis.predictedClass} size="sm" />
              </div>

              <CircularProgress value={diagnosis.confidence} label="Reliability" subLabel="Analysis" />
            </div>

            {/* Stage Progression */}
            <div className="mb-6 pt-4 border-t border-border/50">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-4">Disease Progression Stage</h4>
              <StageProgression currentStage={diagnosis.stage || 'Normal'} />
            </div>

            {/* Risk Panel */}
            <RiskPanel riskLevel={diagnosis.riskLevel || 'Low'} urgency={diagnosis.urgency || 'Routine'} />
          </motion.div>

          {/* Clinical Analytics Panel */}
          {!liteMode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 sm:p-8 border-l-4 border-l-primary"
            >
              <div className="mb-6">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Probability Breakdowns
                </h3>
                <p className="text-[10px] text-muted-foreground mt-1">Multi-stage probability distribution across all clinical categories.</p>
              </div>

              <div className="space-y-8">
                {/* 1. Categorical Match Results */}
                <div className="space-y-4">
                  <h4 className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest border-b border-border pb-1">Categorical Match</h4>
                  <DifferentialDiagnosis conditions={diagnosis.differentialDiagnosis || []} />
                </div>

                {/* 2. Triage & Risk Metrics */}
                <div className="space-y-5 pt-2">
                  <h4 className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest border-b border-border pb-1">Relative Triage Metrics</h4>

                  <ConfidenceBar
                    label="Screening: Abnormal vs. Normal"
                    leftLabel="Suspected Abnormal"
                    rightLabel="Expected Normal"
                    leftValue={diagnosis.normalVsAbnormal.abnormal}
                    rightValue={diagnosis.normalVsAbnormal.normal}
                    leftColor="bg-red-500"
                    rightColor="bg-slate-300"
                  />

                  {diagnosis.normalVsAbnormal.abnormal > 15 && (
                    <>
                      <ConfidenceBar
                        label="Nature: Malignant vs. Benign"
                        leftLabel="Suspected Malignant"
                        rightLabel="Confirmed Benign"
                        leftValue={diagnosis.benignVsMalignant.malignant}
                        rightValue={diagnosis.benignVsMalignant.benign}
                        leftColor="bg-orange-500"
                        rightColor="bg-emerald-400"
                      />

                      {!(diagnosis.predictedClass === 'Normal' || diagnosis.predictedClass === 'Benign') && (
                        <ConfidenceBar
                          label="Severity: Cancer vs. Pre-Cancer"
                          leftLabel="Advanced Cancerous"
                          rightLabel="Early Pre-Cancerous"
                          leftValue={diagnosis.precancerVsCancer.cancer}
                          rightValue={diagnosis.precancerVsCancer.precancer}
                          leftColor="bg-red-600"
                          rightColor="bg-amber-400"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ActionPlan steps={diagnosis.nextSteps || []} />
          </motion.div>

          {/* Actions Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-20 flex flex-col gap-2 hover:bg-secondary/50 border-border/60 shadow-sm" onClick={() => window.print()}>
              <Printer className="h-5 w-5 text-muted-foreground" />
              Print View
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2 hover:bg-secondary/50 border-border/60 shadow-sm">
              <Share2 className="h-5 w-5 text-muted-foreground" />
              Share Securely
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

