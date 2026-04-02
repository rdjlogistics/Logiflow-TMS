import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle, XCircle, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAnalyze: () => void;
  onBulkApprove: () => void;
  isAnalyzing?: boolean;
  analyzeProgress?: { current: number; total: number };
}

export function BulkActions({
  selectedCount, onClearSelection, onBulkAnalyze, onBulkApprove,
  isAnalyzing, analyzeProgress
}: BulkActionsProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-fit safe-area-bottom"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-[var(--shadow-elevation)]">
            <Badge variant="secondary" className="tabular-nums">
              {selectedCount} geselecteerd
            </Badge>

            {isAnalyzing && analyzeProgress ? (
              <div className="flex items-center gap-2 min-w-[140px]">
                <Progress value={(analyzeProgress.current / analyzeProgress.total) * 100} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {analyzeProgress.current}/{analyzeProgress.total}
                </span>
              </div>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={onBulkAnalyze} disabled={isAnalyzing} className="gap-1.5">
                  <Brain className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">AI Analyse</span>
                </Button>
                <Button size="sm" onClick={onBulkApprove} className="gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Goedkeuren</span>
                </Button>
              </>
            )}

            <Button size="icon" variant="ghost" onClick={onClearSelection} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
