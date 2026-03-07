import { motion } from 'framer-motion';
import { Calendar, ArrowRight, FileText, User } from 'lucide-react';
import { CaseRecord } from '@/lib/types';
import DiagnosisBadge from './DiagnosisBadge';
import { Button } from '@/components/ui/button';
import { generatePDFReport } from '@/lib/pdfGenerator';

interface CaseCardProps {
  caseRecord: CaseRecord;
  onView: (id: string) => void;
  index: number;
}

export default function CaseCard({ caseRecord, onView, index }: CaseCardProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await generatePDFReport(caseRecord);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group cursor-pointer rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm transition-all hover:bg-card hover:border-primary/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
      onClick={() => onView(caseRecord.id)}
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-secondary border border-border/50">
              <img
                src={caseRecord.originalImage}
                alt="Case thumbnail"
                className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground line-clamp-1">
                {caseRecord.patientDetails.patientName || 'Unnamed Patient'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                {caseRecord.patientDetails.patientId ? (
                  <span className="font-mono bg-muted/50 px-1 py-0.5 rounded text-[10px]">{caseRecord.patientDetails.patientId}</span>
                ) : (
                  <span className="italic">No ID</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <DiagnosisBadge diagnosis={caseRecord.diagnosis.predictedClass} size="sm" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(caseRecord.createdAt).toLocaleDateString()}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
              onClick={handleDownload}
              title="Download PDF Report"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-3 text-xs gap-1 rounded-full bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary pl-2 pr-1"
            >
              View
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
