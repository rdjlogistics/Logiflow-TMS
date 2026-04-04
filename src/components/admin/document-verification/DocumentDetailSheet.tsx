import { useState, useEffect } from 'react';

import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { AIConfidenceGauge } from './AIConfidenceGauge';
import { type DriverDocument, documentTypeLabels } from './DocumentCard';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  Brain, CheckCircle, XCircle, Shield, Eye, Fingerprint, 
  FileText, RefreshCw, AlertTriangle, Calendar, Hash, Building
} from 'lucide-react';

const QUICK_REJECT_REASONS = [
  'Document is onleesbaar of van slechte kwaliteit',
  'Document is verlopen',
  'Verkeerd documenttype geüpload',
  'Foto is niet volledig zichtbaar',
  'Document lijkt bewerkt/gemanipuleerd',
  'Naam komt niet overeen met profiel',
];

interface DocumentDetailSheetProps {
  doc: DriverDocument | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onReanalyze: (doc: DriverDocument) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  isReanalyzing?: boolean;
}

export function DocumentDetailSheet({
  doc, open, onClose, onApprove, onReject, onReanalyze,
  isApproving, isRejecting, isReanalyzing
}: DocumentDetailSheetProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('overview');

  // Load signed URL
  useEffect(() => {
    if (!doc?.file_url) { setSignedUrl(null); setImageLoading(false); return; }
    setImageLoading(true);
    const load = async () => {
      if (doc.file_url!.includes('driver-documents')) {
        const pathMatch = doc.file_url!.match(/driver-documents\/(.+)/);
        if (pathMatch) {
          const { data } = await supabase.storage.from('driver-documents').createSignedUrl(pathMatch[1], 3600);
          setSignedUrl(data?.signedUrl || doc.file_url);
        }
      } else {
        setSignedUrl(doc.file_url);
      }
      setImageLoading(false);
    };
    load();
  }, [doc?.file_url]);

  // Reset on close
  useEffect(() => {
    if (!open) { setShowRejectForm(false); setRejectionReason(''); setActiveAnalysisTab('overview'); }
  }, [open]);

  if (!doc) return null;

  const analysis = doc.ai_analysis_json;
  const hasFraud = analysis?.fraudIndicators?.length > 0;
  const authenticityScore = analysis?.authenticityScore;

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg md:max-w-xl p-0 overflow-hidden flex flex-col [&>button]:top-4 [&>button]:right-4"
      >
        {/* Header with gradient */}
        <div className="relative px-5 pt-5 pb-4 border-b border-border/30" style={{ background: 'var(--gradient-mesh)' }}>
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              {documentTypeLabels[doc.document_type] || doc.document_type}
            </SheetTitle>
            <SheetDescription className="flex items-center gap-2 flex-wrap">
              <span>{doc.profiles?.full_name || 'Onbekend'}</span>
              {doc.submitted_at && (
                <>
                  <span>•</span>
                  <span>{format(new Date(doc.submitted_at), 'dd MMMM yyyy HH:mm', { locale: nl })}</span>
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          {/* Score badges */}
          <div className="flex items-center gap-3 mt-3">
            {doc.ai_confidence_score !== null && (
              <AIConfidenceGauge score={doc.ai_confidence_score} size={56} label="AI Score" />
            )}
            {authenticityScore !== undefined && (
              <AIConfidenceGauge score={authenticityScore} size={56} label="Authenticiteit" />
            )}
            <div className="flex flex-col gap-1 ml-auto">
              <Badge variant={doc.verification_status === 'verified' ? 'default' : doc.verification_status === 'rejected' ? 'destructive' : 'secondary'}>
                {doc.verification_status === 'verified' ? '✓ Geverifieerd' : doc.verification_status === 'rejected' ? '✕ Afgekeurd' : '⏳ In afwachting'}
              </Badge>
              {hasFraud && (
                <Badge variant="destructive" className="gap-1">
                  <Fingerprint className="h-3 w-3" />
                  Fraude gedetecteerd
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
          {/* Document Image */}
          <div className="relative rounded-xl overflow-hidden bg-muted/30 border border-border/20">
            {imageLoading ? (
              <Skeleton className="w-full h-56" />
            ) : signedUrl ? (
              <img
                src={signedUrl}
                alt="Document"
                className="w-full max-h-72 object-contain animate-scale-fade-in"
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Geen afbeelding beschikbaar</p>
              </div>
            )}

            {/* Fraud overlay indicators */}
            {hasFraud && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-2 border-destructive/40 rounded-xl" />
                <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-destructive/90 text-destructive-foreground text-[10px] font-bold flex items-center gap-1">
                  <Fingerprint className="h-3 w-3" />
                  FRAUD ALERT
                </div>
              </div>
            )}
          </div>

          {/* AI Analysis Tabs */}
          {analysis && (
            <Tabs value={activeAnalysisTab} onValueChange={setActiveAnalysisTab}>
              <TabsList className="w-full grid grid-cols-4 h-9">
                <TabsTrigger value="overview" className="text-xs">Overzicht</TabsTrigger>
                <TabsTrigger value="quality" className="text-xs">Kwaliteit</TabsTrigger>
                <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
                <TabsTrigger value="fraud" className="text-xs relative">
                  Fraude
                  {hasFraud && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </TabsTrigger>
              </TabsList>


                <div
                  key={activeAnalysisTab}
                  className="animate-fade-in"
                >
                  <TabsContent value="overview" className="mt-3 space-y-3">
                    <AnalysisSection title="AI Bevindingen" icon={Brain}>
                      <div className="grid grid-cols-2 gap-3">
                        <InfoPill label="Documenttype" value={analysis.documentType || '-'} />
                        <InfoPill label="Vertrouwen" value={`${doc.ai_confidence_score || 0}%`} />
                        {analysis.detectedExpiry && (
                          <InfoPill label="Vervaldatum" value={format(new Date(analysis.detectedExpiry), 'dd MMM yyyy', { locale: nl })} />
                        )}
                        {analysis.authenticityScore !== undefined && (
                          <InfoPill label="Authenticiteit" value={`${analysis.authenticityScore}%`} />
                        )}
                      </div>
                    </AnalysisSection>

                    {analysis.suggestions?.length > 0 && (
                      <AnalysisSection title="Suggesties" icon={FileText}>
                        <ul className="space-y-1.5">
                          {analysis.suggestions.map((s: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">→</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </AnalysisSection>
                    )}
                  </TabsContent>

                  <TabsContent value="quality" className="mt-3 space-y-3">
                    <AnalysisSection title="Kwaliteitsproblemen" icon={AlertTriangle}>
                      {doc.ai_quality_issues?.length ? (
                        <ul className="space-y-1.5">
                          {doc.ai_quality_issues.map((issue, i) => (
                            <li key={i} className="text-xs text-warning flex items-start gap-2">
                              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-success flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Geen kwaliteitsproblemen gevonden
                        </p>
                      )}
                    </AnalysisSection>
                  </TabsContent>

                  <TabsContent value="data" className="mt-3 space-y-3">
                    <AnalysisSection title="Geëxtraheerde Data" icon={FileText}>
                      {analysis.extractedData ? (
                        <div className="grid grid-cols-1 gap-2">
                          {analysis.extractedData.name && <InfoPill label="Naam" value={analysis.extractedData.name} />}
                          {analysis.extractedData.documentNumber && <InfoPill label="Documentnr" value={analysis.extractedData.documentNumber} icon={Hash} />}
                          {analysis.extractedData.issueDate && <InfoPill label="Uitgiftedatum" value={analysis.extractedData.issueDate} icon={Calendar} />}
                          {analysis.extractedData.expiryDate && <InfoPill label="Vervaldatum" value={analysis.extractedData.expiryDate} icon={Calendar} />}
                          {analysis.extractedData.issuingAuthority && <InfoPill label="Instantie" value={analysis.extractedData.issuingAuthority} icon={Building} />}
                          {analysis.extractedData.categories && <InfoPill label="Categorieën" value={analysis.extractedData.categories} />}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Geen data geëxtraheerd</p>
                      )}
                    </AnalysisSection>
                  </TabsContent>

                  <TabsContent value="fraud" className="mt-3 space-y-3">
                    <AnalysisSection title="Fraude Detectie" icon={Fingerprint}>
                      {hasFraud ? (
                        <ul className="space-y-1.5">
                          {analysis.fraudIndicators.map((f: string, i: number) => (
                            <li key={i} className="text-xs text-destructive flex items-start gap-2">
                              <Fingerprint className="h-3 w-3 mt-0.5 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-success flex items-center gap-2">
                          <Shield className="h-3.5 w-3.5" />
                          Geen fraude-indicatoren gedetecteerd
                        </p>
                      )}
                    </AnalysisSection>
                  </TabsContent>
                </div>

            </Tabs>
          )}

          {/* Rejection reason display */}
          {doc.rejection_reason && (
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/15">
              <p className="text-xs font-semibold text-destructive mb-1">Reden afkeuring:</p>
              <p className="text-xs text-muted-foreground">{doc.rejection_reason}</p>
            </div>
          )}

          {/* Quick reject form */}

            {showRejectForm && (
              <div
                className="overflow-hidden animate-fade-in"
              >
                <div className="space-y-3 p-3 rounded-xl border border-destructive/20 bg-destructive/5">
                  <p className="text-sm font-semibold text-destructive">Document afkeuren</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REJECT_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setRejectionReason(reason)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] border transition-colors',
                          rejectionReason === reason
                            ? 'bg-destructive/15 border-destructive/40 text-destructive'
                            : 'border-border/40 text-muted-foreground hover:border-destructive/30'
                        )}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Of typ een eigen reden..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowRejectForm(false)} className="flex-1">
                      Annuleren
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!rejectionReason.trim() || isRejecting}
                      onClick={() => onReject(doc.id, rejectionReason)}
                      className="flex-1"
                    >
                      {isRejecting ? 'Bezig...' : 'Afkeuren'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Sticky action bar */}
        <div className="border-t border-border/30 p-4 flex gap-2 bg-card/95 backdrop-blur-sm safe-area-bottom">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReanalyze(doc)}
            disabled={isReanalyzing}
            className="gap-1.5"
          >
            <Brain className={cn('h-4 w-4', isReanalyzing && 'animate-spin')} />
            <span className="hidden sm:inline">{isReanalyzing ? 'Bezig...' : 'AI Analyse'}</span>
          </Button>

          <div className="flex-1" />

          {doc.verification_status !== 'rejected' && !showRejectForm && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowRejectForm(true)}
              className="gap-1.5"
            >
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Afkeuren</span>
            </Button>
          )}

          {doc.verification_status !== 'verified' && (
            <Button
              size="sm"
              onClick={() => onApprove(doc.id)}
              disabled={isApproving}
              className="gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              {isApproving ? 'Bezig...' : 'Goedkeuren'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AnalysisSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/20 bg-card/40 p-3">
      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2.5">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoPill({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground truncate">{value}</span>
    </div>
  );
}
