import { CheckSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionPlanProps {
    steps: string[];
}

export default function ActionPlan({ steps }: ActionPlanProps) {
    return (
        <div className="glass-card p-6">
            <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <CheckSquare className="h-4 w-4" />
                </div>
                Recommended Clinical Action Plan
            </h3>

            <div className="space-y-3">
                {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30 group hover:border-primary/30 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-muted-foreground border border-border shadow-sm group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                            {i + 1}
                        </div>
                        <span className="text-sm text-foreground pt-0.5">{step}</span>
                    </div>
                ))}
            </div>

            <Button variant="ghost" className="w-full mt-4 text-xs text-muted-foreground hover:text-primary justify-between">
                View Clinical Guidelines Reference
                <ArrowRight className="h-3 w-3" />
            </Button>
        </div>
    );
}
