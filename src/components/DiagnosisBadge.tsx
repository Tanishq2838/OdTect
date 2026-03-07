import { DiagnosisClass } from '@/lib/types';
import { motion } from 'framer-motion';
import { Check, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';

interface DiagnosisBadgeProps {
  diagnosis: DiagnosisClass;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const config: Record<DiagnosisClass, { 
  icon: typeof Check; 
  className: string;
  bgClass: string;
}> = {
  Normal: {
    icon: Check,
    className: 'text-diagnostic-green',
    bgClass: 'bg-diagnostic-green-light',
  },
  Benign: {
    icon: AlertCircle,
    className: 'text-primary',
    bgClass: 'bg-medical-blue-light',
  },
  Precancerous: {
    icon: AlertTriangle,
    className: 'text-precancer-amber',
    bgClass: 'bg-precancer-amber-light',
  },
  Cancerous: {
    icon: XCircle,
    className: 'text-alert-red',
    bgClass: 'bg-alert-red-light',
  },
};

const sizeClasses = {
  sm: 'px-2.5 py-1 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-3',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export default function DiagnosisBadge({ 
  diagnosis, 
  size = 'md',
  showIcon = true 
}: DiagnosisBadgeProps) {
  const { icon: Icon, className, bgClass } = config[diagnosis];
  
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center rounded-full font-semibold ${sizeClasses[size]} ${bgClass} ${className}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {diagnosis}
    </motion.div>
  );
}
