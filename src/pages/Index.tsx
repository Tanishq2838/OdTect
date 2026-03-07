import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { Scan, Shield, Activity, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';
import PatientForm from '@/components/PatientForm';
import AnalyzingOverlay from '@/components/AnalyzingOverlay';
import { Button } from '@/components/ui/button';
import { PatientDetails, CaseRecord } from '@/lib/types';
import { generateMockDiagnosis, generateGradCamOverlay } from '@/lib/mockData';
import { saveCaseToStorage } from '@/lib/caseStorage';

const features = [
  {
    icon: Activity,
    title: 'Instant Analysis',
    description: 'Real-time oral lesion classification using advanced deep learning models.',
  },
  {
    icon: Shield,
    title: 'Clinical Precision',
    description: 'Trained on thousands of verified medical cases for high-fidelity results.',
  },
  {
    icon: FileText,
    title: 'Smart Reporting',
    description: 'Generate comprehensive PDF reports ready for clinical documentation.',
  },
];

export default function Index() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [patientDetails, setPatientDetails] = useState<PatientDetails>({
    patientName: '',
    patientId: '',
    age: '',
    gender: '',
    examinationDate: new Date().toISOString().split('T')[0],
    clinicalNotes: '',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  // Parallax Hero Mouse Effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position from -1 to 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const xSpring = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const ySpring = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const heroX = useTransform(xSpring, [-1, 1], [-20, 20]);
  const heroY = useTransform(ySpring, [-1, 1], [-20, 20]);

  // Helper to process Data URI
  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAnalysisStep(0);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800)); // Brief delay for UX
      setAnalysisStep(1);

      // Convert image and send to API
      const blob = dataURItoBlob(selectedImage);

      // Import dynamically to avoid top-level async issues or standard import
      const { analyzeImage } = await import('@/lib/api');
      const { diagnosis, gradCamImage: serverGradCam } = await analyzeImage(blob);

      setAnalysisStep(2);

      // Use server GradCAM if available, else fall back to mock
      const gradCamImage = serverGradCam || await generateGradCamOverlay(selectedImage);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const caseRecord: CaseRecord = {
        id: diagnosis.id, // Use ID from diagnosis
        patientDetails,
        originalImage: selectedImage,
        gradCamImage,
        diagnosis,
        createdAt: new Date(),
      };

      saveCaseToStorage(caseRecord);
      navigate(`/results?id=${caseRecord.id}`);

    } catch (error) {
      console.error("Analysis failed:", error);
      // Surface useful error details to the clinician
      const message = error instanceof Error ? error.message : 'Unknown error occurred.';
      alert(`Analysis failed. Please try again and ensure the backend server is running. Details: ${message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedImage, patientDetails, navigate]);

  return (
    <div className="space-y-16 pb-16 relative overflow-hidden">

      {/* Background Ambience */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <motion.div
          style={{ x: heroX, y: heroY }}
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]"
        />
        <motion.div
          style={{ x: useTransform(heroX, (v) => v * -1.5), y: useTransform(heroY, (v) => v * -1.5) }}
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px]"
        />
      </div>

      {/* Hero Header */}
      <section className="text-center space-y-6 pt-8 sm:pt-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Next-Gen Diagnostic Support
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold font-heading tracking-tight text-foreground text-balance">
            O_Dtect: Precision AI for <br className="hidden sm:block" />
            <span className="text-gradient-primary">
              Oral Diagnosis
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-balance leading-relaxed">
            Empowering dental professionals with instant, explainable diagnostic insights using state-of-the-art computer vision.
          </p>
        </motion.div>
      </section>

      {/* Main Action Area */}
      <div className="grid lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto relative z-10">

        {/* Left Column: Upload & Preview */}
        <motion.div
          className="lg:col-span-7 space-y-6"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden group border-white/20 shadow-2xl shadow-primary/5">
            <div className="absolute -top-10 -right-10 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 transform group-hover:rotate-12 group-hover:scale-110">
              <Scan className="w-64 h-64 text-primary" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <span className="bg-primary text-primary-foreground w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold shadow-lg shadow-primary/20">1</span>
                  Image Capture
                </h2>
                {selectedImage && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1 text-sm font-medium text-status-success bg-status-success/10 px-3 py-1 rounded-full border border-status-success/20"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Ready for Analysis
                  </motion.span>
                )}
              </div>

              <ImageUploader
                selectedImage={selectedImage}
                onImageSelect={setSelectedImage}
              />
            </div>
          </div>
        </motion.div>

        {/* Right Column: Details & Action */}
        <motion.div
          className="lg:col-span-5 space-y-6"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="glass-card rounded-3xl p-6 sm:p-8 border-white/20 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-primary/10 text-primary w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold border border-primary/20">2</span>
              <h2 className="text-xl font-semibold">Patient Context</h2>
            </div>

            <PatientForm
              details={patientDetails}
              onChange={setPatientDetails}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="perspective-1000"
          >
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-10px_rgba(37,99,235,0.6)] transition-all rounded-2xl relative overflow-hidden group"
              disabled={!selectedImage || isAnalyzing}
              onClick={handleAnalyze}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-blue-400 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_auto] animate-shimmer" />
              <div className="relative flex items-center justify-center gap-3">
                {isAnalyzing ? (
                  <>
                    <Activity className="h-6 w-6 animate-spin" />
                    <span className="animate-pulse">Processing Analysis...</span>
                  </>
                ) : (
                  <>
                    <Scan className="h-6 w-6" />
                    Start AI Analysis
                    <ArrowRight className="h-6 w-6 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </Button>
            {!selectedImage && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-muted-foreground mt-4"
              >
                Please upload a clinical image to proceed
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Feature Grid with Staggered Reveal */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-12 relative z-10"
      >
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            whileHover={{ y: -5, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)" }}
            className="glass-card p-6 rounded-2xl hover:bg-white/60 transition-all duration-300 border border-white/20"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-blue-500/5 flex items-center justify-center mb-4 text-primary">
              <feature.icon className="h-7 w-7" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-foreground">{feature.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </motion.section>

      <AnimatePresence>
        {isAnalyzing && <AnalyzingOverlay currentStep={analysisStep} />}
      </AnimatePresence>
    </div>
  );
}
