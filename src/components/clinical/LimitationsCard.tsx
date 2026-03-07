import { AlertTriangle, Info } from 'lucide-react';

export default function LimitationsCard() {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Model Limitations & Bias Disclosure
            </h3>

            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li>
                    <strong>Training Data Scope:</strong> Model trained primarily on biopsy-confirmed datasets from routine clinical settings. May vary in rare or atypical presentations.
                </li>
                <li>
                    <strong>Lighting Sensitivity:</strong> Performance may degrade in poor lighting or with significant glare artifacts.
                </li>
                <li>
                    <strong>Demographic Bias:</strong> Dataset demographics are balanced but verify results critically for underrepresented age/ethnic groups.
                </li>
                <li>
                    <strong>Not a Diagnosis:</strong> This tool provides probability-based screening guidance only. It cannot replace histological verification.
                </li>
            </ul>
        </div>
    );
}
