import { motion } from 'framer-motion';

interface ConfidenceBarProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  leftValue: number;
  rightValue: number;
  leftColor?: string;
  rightColor?: string;
}

export default function ConfidenceBar({
  label,
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
  leftColor = 'bg-primary',
  rightColor = 'bg-muted-foreground',
}: ConfidenceBarProps) {
  const total = leftValue + rightValue;
  const leftPercent = (leftValue / total) * 100;
  const rightPercent = (rightValue / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
      </div>

      <div className="flex h-8 overflow-hidden rounded-lg bg-muted">
        <motion.div
          className={`flex items-center justify-center ${leftColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${leftPercent}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {leftPercent > 15 && (
            <span className="text-xs font-medium text-white">
              {leftValue.toFixed(2)}%
            </span>
          )}
        </motion.div>
        <motion.div
          className={`flex items-center justify-center ${rightColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${rightPercent}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {rightPercent > 15 && (
            <span className="text-xs font-medium text-white">
              {rightValue.toFixed(2)}%
            </span>
          )}
        </motion.div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
