import { RiskLevel, UrgencyLevel } from '@/lib/types';
import { ShieldAlert, ShieldCheck, Clock, Siren } from 'lucide-react';

interface RiskPanelProps {
    riskLevel: RiskLevel;
    urgency: UrgencyLevel;
}

const riskConfig = {
    Low: { color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', icon: ShieldCheck, label: 'Low Risk' },
    Moderate: { color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', icon: ShieldAlert, label: 'Moderate Risk' },
    High: { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', icon: Siren, label: 'High Risk' },
};

const urgencyConfig = {
    Routine: { color: 'ml-0', badge: 'bg-blue-100 text-blue-700', icon: Clock },
    'Follow-Up': { color: 'animate-pulse', badge: 'bg-amber-100 text-amber-700', icon: Clock },
    Immediate: { color: 'animate-bounce', badge: 'bg-red-100 text-red-700', icon: Siren },
};

export default function RiskPanel({ riskLevel, urgency }: RiskPanelProps) {
    const risk = riskConfig[riskLevel];
    const urg = urgencyConfig[urgency];
    const RiskIcon = risk.icon;
    const UrgencyIcon = urg.icon;

    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Risk Level Card */}
            <div className={`${risk.bg} border border-${risk.text.replace('text-', '')}/20 rounded-2xl p-4 flex flex-col justify-between`}>
                <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${risk.text} opacity-70`}>Stratification</span>
                    <RiskIcon className={`w-5 h-5 ${risk.text}`} />
                </div>
                <div>
                    <div className={`text-2xl font-bold ${risk.text}`}>{risk.label}</div>
                    <div className="w-full h-1.5 bg-black/5 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full ${risk.color} w-full`} />
                    </div>
                </div>
            </div>

            {/* Urgency Card */}
            <div className="bg-secondary/30 border border-border/50 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action Urgency</span>
                    <UrgencyIcon className={`w-5 h-5 text-foreground ${urg.color}`} />
                </div>
                <div className="flex items-end justify-between">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${urg.badge}`}>
                        {urgency} Attention
                    </span>
                </div>
            </div>
        </div>
    );
}
