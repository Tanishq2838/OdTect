import { motion } from 'framer-motion';
import { Scan, Brain, Activity } from 'lucide-react';

const steps = [
  { icon: Scan, label: 'Preprocessing image...' },
  { icon: Brain, label: 'Running AI analysis...' },
  { icon: Activity, label: 'Generating explanation...' },
];

interface AnalyzingOverlayProps {
  currentStep: number;
}

export default function AnalyzingOverlay({ currentStep }: AnalyzingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-medical-lg"
      >
        <div className="mb-8 text-center">
          <motion.div
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Brain className="h-10 w-10 text-primary" />
          </motion.div>
          <h3 className="text-xl font-semibold text-foreground">Analyzing Image</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Our AI is examining the oral lesion
          </p>
        </div>
        
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;
            
            return (
              <motion.div
                key={index}
                className={`flex items-center gap-4 rounded-lg p-3 transition-colors ${
                  isActive
                    ? 'bg-primary/10'
                    : isComplete
                    ? 'bg-accent/10'
                    : 'bg-muted/50'
                }`}
                animate={isActive ? { x: [0, 5, 0] } : {}}
                transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isComplete
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-sm font-medium ${
                    isActive
                      ? 'text-primary'
                      : isComplete
                      ? 'text-accent'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
                {isActive && (
                  <motion.div
                    className="ml-auto h-2 w-2 rounded-full bg-primary"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
                {isComplete && (
                  <span className="ml-auto text-xs font-medium text-accent">?</span>
                )}
              </motion.div>
            );
          })}
        </div>
        
        <div className="mt-6">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
