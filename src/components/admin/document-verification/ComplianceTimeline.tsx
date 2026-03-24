import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { type DriverDocument, documentTypeLabels } from './DocumentCard';
import { differenceInDays, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ComplianceTimelineProps {
  documents: DriverDocument[];
}

function getExpiryStatus(expiryDate: string | null): { color: string; label: string; urgency: number } {
  if (!expiryDate) return { color: 'text-muted-foreground', label: 'Onbekend', urgency: 0 };
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days < 0) return { color: 'text-foreground', label: 'Verlopen', urgency: 4 };
  if (days <= 30) return { color: 'text-destructive', label: `${days}d`, urgency: 3 };
  if (days <= 90) return { color: 'text-warning', label: `${days}d`, urgency: 2 };
  return { color: 'text-success', label: `${days}d`, urgency: 1 };
}

export function ComplianceTimeline({ documents }: ComplianceTimelineProps) {
  const docsWithExpiry = documents
    .filter(d => d.expiry_date || d.ai_detected_expiry)
    .sort((a, b) => {
      const dateA = a.expiry_date || a.ai_detected_expiry || '';
      const dateB = b.expiry_date || b.ai_detected_expiry || '';
      return getExpiryStatus(dateA).urgency > getExpiryStatus(dateB).urgency ? -1 : 1;
    });

  if (docsWithExpiry.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/20 bg-card/40 backdrop-blur-sm p-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-primary" />
        Compliance Timeline
      </h3>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2 min-w-max">
          {docsWithExpiry.map((doc, i) => {
            const date = doc.expiry_date || doc.ai_detected_expiry;
            const status = getExpiryStatus(date);
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border min-w-[100px]',
                  'bg-card/60 border-border/20',
                  status.urgency >= 3 && 'border-destructive/30 bg-destructive/5',
                  status.urgency === 2 && 'border-warning/30 bg-warning/5'
                )}
              >
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {documentTypeLabels[doc.document_type]?.split(' ')[0] || doc.document_type}
                </span>
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  status.urgency >= 4 ? 'bg-foreground' :
                  status.urgency >= 3 ? 'bg-destructive animate-pulse' :
                  status.urgency >= 2 ? 'bg-warning' : 'bg-success'
                )} />
                <span className={cn('text-[10px] font-semibold', status.color)}>
                  {status.label}
                </span>
                {date && (
                  <span className="text-[9px] text-muted-foreground">
                    {format(new Date(date), 'dd MMM yy', { locale: nl })}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
