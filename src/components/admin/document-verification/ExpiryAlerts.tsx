import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { type DriverDocument, documentTypeLabels } from './DocumentCard';
import { differenceInDays, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AlertTriangle, Bell, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ExpiryAlertsProps {
  documents: DriverDocument[];
}

export function ExpiryAlerts({ documents }: ExpiryAlertsProps) {
  const expiringDocs = documents
    .filter(d => {
      const date = d.expiry_date || d.ai_detected_expiry;
      if (!date) return false;
      const days = differenceInDays(new Date(date), new Date());
      return days <= 90;
    })
    .sort((a, b) => {
      const dA = differenceInDays(new Date(a.expiry_date || a.ai_detected_expiry || ''), new Date());
      const dB = differenceInDays(new Date(b.expiry_date || b.ai_detected_expiry || ''), new Date());
      return dA - dB;
    });

  if (expiringDocs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-warning/20 bg-warning/5 backdrop-blur-sm p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Verlopende Documenten
          <Badge variant="secondary" className="text-[10px]">{expiringDocs.length}</Badge>
        </h3>
      </div>

      <div className="space-y-2">
        {expiringDocs.slice(0, 5).map((doc, i) => {
          const date = doc.expiry_date || doc.ai_detected_expiry || '';
          const days = differenceInDays(new Date(date), new Date());
          const isExpired = days < 0;

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-card/50 border border-border/15"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {documentTypeLabels[doc.document_type] || doc.document_type}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {doc.profiles?.full_name || 'Onbekend'} • {format(new Date(date), 'dd MMM yyyy', { locale: nl })}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 text-[10px]',
                  isExpired ? 'text-foreground bg-foreground/10 border-foreground/20' :
                  days <= 30 ? 'text-destructive bg-destructive/10 border-destructive/20' :
                  'text-warning bg-warning/10 border-warning/20'
                )}
              >
                <Clock className="h-2.5 w-2.5 mr-0.5" />
                {isExpired ? 'Verlopen' : `${days}d`}
              </Badge>
            </motion.div>
          );
        })}
        {expiringDocs.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{expiringDocs.length - 5} meer verlopende documenten
          </p>
        )}
      </div>
    </motion.div>
  );
}
