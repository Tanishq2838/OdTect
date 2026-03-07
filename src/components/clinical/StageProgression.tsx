import { motion } from 'framer-motion';
import { DiagnosisStage } from '@/lib/types';
import { CheckCircle2, ChevronRight, AlertCircle, AlertOctagon, Activity } from 'lucide-react';

interface StageProgressionProps {
    currentStage: DiagnosisStage;
}

const stages: { id: DiagnosisStage; label: string; color: string; icon: any }[] = [
    { id: 'Normal', label: 'Normal', color: 'bg-emerald-500', icon: CheckCircle2 },
    { id: 'Benign', label: 'Benign', color: 'bg-blue-500', icon: Activity },
    { id: 'Precancer', label: 'Precancer', color: 'bg-amber-500', icon: AlertCircle },
    { id: 'Cancer', label: 'Cancer', color: 'bg-red-600', icon: AlertOctagon },
];

export default function StageProgression({ currentStage }: StageProgressionProps) {
    const currentIndex = stages.findIndex(s => s.id === currentStage);

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between relative">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 w-full h-1 bg-secondary -z-10 rounded-full" />
                <div
                    className="absolute left-0 top-1/2 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600 -z-10 rounded-full transition-all duration-1000"
                    style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
                />

                {stages.map((stage, index) => {
                    const isActive = index === currentIndex;
                    const isPast = index < currentIndex;
                    const Icon = stage.icon;

                    return (
                        <div key={stage.id} className="flex flex-col items-center gap-2 group">
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{
                                    scale: isActive ? 1.2 : 1,
                                    backgroundColor: isActive || isPast ? 'var(--background)' : 'var(--background)',
                                    borderColor: isActive || isPast ? 'transparent' : 'var(--border)'
                                }}
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 shadow-sm transition-colors duration-300 relative ${isActive ? `ring-4 ring-${stage.color}/20` : ''
                                    }`}
                            >
                                <div className={`absolute inset-0 rounded-full ${isActive || isPast ? stage.color : 'bg-secondary'} opacity-20`} />
                                <Icon className={`w-5 h-5 ${isActive || isPast ? `text-${stage.color.replace('bg-', '')}` : 'text-muted-foreground'}`} />

                                {isActive && (
                                    <motion.div
                                        layoutId="activeGlow"
                                        className={`absolute inset-0 rounded-full ${stage.color} opacity-40 blur-md`}
                                    />
                                )}
                            </motion.div>

                            <div className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors ${isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                                }`}>
                                {stage.label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
