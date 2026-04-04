
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Brain, User, Calendar, CheckCircle, XCircle, Clock, 
  AlertTriangle, ChevronRight, Shield, Fingerprint 
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AIConfidenceGauge } from './AIConfidenceGauge';

export interface DriverDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string | null;
  file_name: string | null;
  expiry_date: string | null;
  document_number: string | null;
  verification_status: string;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  ai_analysis_json: any;
  ai_analyzed_at: string | null;
  ai_confidence_score: number | null;
  ai_detected_expiry: string | null;
  ai_quality_issues: string[] | null;
  admin_review_required: boolean | null;
  priority_level: string | null;
  submitted_at: string | null;
  profiles?: { full_name: string | null };
}

export const documentTypeLabels: Record<string, string> = {
  drivers_license_front: 'Rijbewijs (Voorzijde)',
  drivers_license_back: 'Rijbewijs (Achterzijde)',
  cpc_card: 'Chauffeurskaart (CPC)',
  adr_certificate: 'ADR-certificaat',
  identity_document: 'Identiteitsbewijs',
  profile_photo: 'Profielfoto',
  insurance_certificate: 'WAM Verzekering',
  liability_insurance: 'AVB Verzekering',
};

const priorityConfig: Record<string, { color: string; border: string; bg: string }> = {
  urgent: { color: 'text-destructive', border: 'border-destructive/30', bg: 'bg-destructive/10' },
  high: { color: 'text-warning', border: 'border-warning/30', bg: 'bg-warning/10' },
  normal: { color: 'text-info', border: 'border-info/30', bg: 'bg-info/10' },
  low: { color: 'text-success', border: 'border-success/30', bg: 'bg-success/10' },
};

interface DocumentCardProps {
  doc: DriverDocument;
  index: number;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onClick: () => void;
}

export function DocumentCard({ doc, index, selected, onSelect, onClick }: DocumentCardProps) {
  const priority = priorityConfig[doc.priority_level || 'normal'] || priorityConfig.normal;
  const hasFraud = doc.ai_analysis_json?.fraudIndicators?.length > 0;

  return (
    <div
      className={cn(
        'animate-fade-in-up',
        'group rounded-xl border bg-card/60 backdrop-blur-sm p-3 md:p-4 cursor-pointer',
        'transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:border-primary/30 hover:-translate-y-0.5',
        'active:scale-[0.995]',
        selected && 'ring-2 ring-primary/40 border-primary/40',
        hasFraud && 'border-destructive/40'
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Bulk select checkbox */}
        {onSelect && (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(doc.id, !!checked)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
        )}

        {/* Priority bar */}
        <div className={cn(
          'w-1 h-12 rounded-full shrink-0',
          doc.priority_level === 'urgent' ? 'bg-destructive' :
          doc.priority_level === 'high' ? 'bg-warning' :
          doc.priority_level === 'normal' ? 'bg-info' : 'bg-success'
        )} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">
              {documentTypeLabels[doc.document_type] || doc.document_type}
            </span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', priority.bg, priority.color, priority.border)}>
              {doc.priority_level}
            </Badge>
            {hasFraud && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                <Fingerprint className="h-2.5 w-2.5" />
                Fraude
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 truncate">
              <User className="h-3 w-3 shrink-0" />
              {doc.profiles?.full_name || 'Onbekend'}
            </span>
            {doc.submitted_at && (
              <span className="hidden sm:flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(doc.submitted_at), 'dd MMM', { locale: nl })}
              </span>
            )}
          </div>
        </div>

        {/* AI score gauge (desktop) */}
        {doc.ai_confidence_score !== null && (
          <div className="hidden md:block shrink-0">
            <AIConfidenceGauge score={doc.ai_confidence_score} size={48} />
          </div>
        )}

        {/* Status icon */}
        <div className="shrink-0 flex items-center gap-1.5">
          {doc.ai_confidence_score !== null && (
            <span className="md:hidden text-xs font-medium text-muted-foreground flex items-center gap-0.5">
              <Brain className="h-3 w-3" />
              {doc.ai_confidence_score}%
            </span>
          )}
          {doc.verification_status === 'verified' && <CheckCircle className="h-5 w-5 text-success" />}
          {doc.verification_status === 'rejected' && <XCircle className="h-5 w-5 text-destructive" />}
          {doc.verification_status === 'pending' && <Clock className="h-5 w-5 text-warning" />}
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* AI Issues row */}
      {doc.ai_quality_issues && doc.ai_quality_issues.length > 0 && (
        <div className="mt-2.5 flex items-start gap-2 p-2 rounded-lg bg-warning/5 border border-warning/10">
          <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-warning/80 line-clamp-1">
            {doc.ai_quality_issues[0]}
            {doc.ai_quality_issues.length > 1 && ` (+${doc.ai_quality_issues.length - 1})`}
          </p>
        </div>
      )}
    </div>
  );
}
