import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { History as HistoryIcon, Search, FolderOpen, ArrowRight } from 'lucide-react';
import CaseCard from '@/components/CaseCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CaseRecord } from '@/lib/types';
import { getCasesFromStorage } from '@/lib/caseStorage';

export default function History() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setCases(getCasesFromStorage());
  }, []);

  const filteredCases = cases.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.patientDetails.patientName?.toLowerCase().includes(query) ||
      c.patientDetails.patientId?.toLowerCase().includes(query) ||
      c.diagnosis.predictedClass.toLowerCase().includes(query)
    );
  });

  const handleView = (id: string) => {
    navigate(`/results?id=${id}`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-end justify-between gap-6"
      >
        <div>
          <h1 className="text-3xl font-bold font-heading text-foreground">Case Archives</h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            View and manage previous AI analysis records. Cases are stored locally in your browser session.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border/60 focus:bg-background transition-all"
          />
        </div>
      </motion.div>

      {/* Content Area */}
      {cases.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-24 bg-card/30"
        >
          <div className="mb-6 h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center">
            <FolderOpen className="h-10 w-10 text-primary/50" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Cases Recorded</h3>
          <p className="text-muted-foreground max-w-sm text-center mb-8">
            Start a new analysis to generate diagnostic reports. Your history will appear here.
          </p>
          <Button onClick={() => navigate('/')} className="shadow-lg shadow-primary/20">
            Start New Analysis <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      ) : filteredCases.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-card/50 border border-border/50">
          <p className="text-lg font-medium text-foreground">No matching cases found</p>
          <p className="text-muted-foreground">Try adjusting your search terms</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCases.map((caseRecord, index) => (
            <CaseCard
              key={caseRecord.id}
              caseRecord={caseRecord}
              onView={handleView}
              index={index}
            />
          ))}
        </div>
      )}

      {cases.length > 0 && (
        <div className="text-center pt-8 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            Showing {filteredCases.length} of {cases.length} records | Session data only
          </p>
        </div>
      )}
    </div>
  );
}
