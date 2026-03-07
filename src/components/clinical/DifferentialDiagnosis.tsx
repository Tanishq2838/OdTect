import { motion } from 'framer-motion';
import { GitBranch } from 'lucide-react';

interface DifferentialDiagnosisProps {
    conditions: { condition: string; probability: number }[];
}

export default function DifferentialDiagnosis({ conditions }: DifferentialDiagnosisProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <GitBranch className="h-4 w-4" />
                Category Breakdown
            </h3>

            <div className="space-y-3">
                {conditions.map((item, index) => (
                    <div key={index} className="group">
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-foreground group-hover:text-primary transition-colors">{item.condition}</span>
                            <span className="text-muted-foreground">{(item.probability * 100).toFixed(0)}% Match</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${item.probability * 100}%` }}
                                transition={{ duration: 1, delay: 0.5 + (index * 0.1) }}
                                className="h-full bg-slate-400 group-hover:bg-primary transition-colors"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-[10px] text-muted-foreground italic mt-2">
                *Similarity based on feature vector proximity in latent space.
            </p>
        </div>
    );
}
