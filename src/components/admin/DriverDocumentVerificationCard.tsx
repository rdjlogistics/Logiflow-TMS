import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  FileCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Brain,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DriverDocument {
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
}

interface Props {
  driverUserId?: string;
  driverId?: string; // Alternative: driver record ID
  driverName?: string;
}

const documentTypeLabels: Record<string, string> = {
  drivers_license_front: 'Rijbewijs (Voorzijde)',
  drivers_license_back: 'Rijbewijs (Achterzijde)',
  cpc_card: 'Chauffeurskaart (CPC)',
  adr_certificate: 'ADR-certificaat',
  identity_document: 'Identiteitsbewijs',
  profile_photo: 'Profielfoto',
};

export function DriverDocumentVerificationCard({ driverUserId, driverId, driverName = 'Chauffeur' }: Props) {
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState<DriverDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Resolve user_id from driverId if needed
  const { data: resolvedUserId } = useQuery({
    queryKey: ['driver-user-id', driverId],
    queryFn: async () => {
      if (!driverId) return null;
      const { data } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', driverId)
        .single();
      return data?.user_id || null;
    },
    enabled: !!driverId && !driverUserId,
  });

  const effectiveUserId = driverUserId || resolvedUserId;

  // Fetch driver's documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['driver-documents', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('user_id', effectiveUserId!)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data as DriverDocument[];
    },
    enabled: !!effectiveUserId,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('driver_documents')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          admin_review_required: false,
          rejection_reason: null,
        })
        .eq('id', docId);
      
      if (error) throw error;

      // Send push notification
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: effectiveUserId,
          title: '✅ Document goedgekeurd',
          body: `Je document is goedgekeurd.`,
          data: { type: 'document_verified', documentId: docId }
        }
      });
    },
    onSuccess: () => {
      toast.success('Document goedgekeurd');
      queryClient.invalidateQueries({ queryKey: ['driver-documents', effectiveUserId] });
      setSelectedDoc(null);
    },
    onError: (error) => {
      toast.error('Fout bij goedkeuren: ' + error.message);
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ docId, reason }: { docId: string; reason: string }) => {
      const { error } = await supabase
        .from('driver_documents')
        .update({
          verification_status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          admin_review_required: false,
          rejection_reason: reason,
        })
        .eq('id', docId);
      
      if (error) throw error;

      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: effectiveUserId,
          title: '❌ Document afgekeurd',
          body: `Je document is afgekeurd. Reden: ${reason}`,
          data: { type: 'document_rejected', documentId: docId, reason }
        }
      });
    },
    onSuccess: () => {
      toast.success('Document afgekeurd');
      queryClient.invalidateQueries({ queryKey: ['driver-documents', effectiveUserId] });
      setSelectedDoc(null);
      setShowRejectDialog(false);
      setRejectionReason('');
    },
    onError: (error) => {
      toast.error('Fout bij afkeuren: ' + error.message);
    }
  });

  // AI Re-analyze mutation
  const reanalyzeMutation = useMutation({
    mutationFn: async (doc: DriverDocument) => {
      const { data, error } = await supabase.functions.invoke('analyze-driver-document', {
        body: {
          documentId: doc.id,
          imageUrl: doc.file_url,
          documentType: doc.document_type
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.autoApproved 
        ? 'Document automatisch goedgekeurd door AI' 
        : 'AI-analyse voltooid');
      queryClient.invalidateQueries({ queryKey: ['driver-documents', driverUserId] });
    },
    onError: (error) => {
      toast.error('AI-analyse mislukt: ' + error.message);
    }
  });

  const pendingCount = documents.filter(d => d.verification_status === 'pending').length;
  const verifiedCount = documents.filter(d => d.verification_status === 'verified').length;
  const rejectedCount = documents.filter(d => d.verification_status === 'rejected').length;

  if (isLoading) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Documenten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Geen documenten geüpload</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/40">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/5 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Documenten Verificatie
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {pendingCount > 0 && (
                      <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        {pendingCount} wachtend
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                      {verifiedCount}/{documents.length}
                    </Badge>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-3">
              {documents.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <div className="flex items-center gap-3">
                    {doc.verification_status === 'verified' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {doc.verification_status === 'rejected' && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {doc.verification_status === 'pending' && (
                      <Clock className="h-5 w-5 text-orange-500" />
                    )}
                    
                    <div>
                      <p className="font-medium text-sm">
                        {documentTypeLabels[doc.document_type] || doc.document_type}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {doc.ai_confidence_score !== null && (
                          <span className="flex items-center gap-1">
                            <Brain className="h-3 w-3" />
                            {doc.ai_confidence_score}%
                          </span>
                        )}
                        {doc.expiry_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(doc.expiry_date), 'dd MMM yyyy', { locale: nl })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {doc.ai_quality_issues && doc.ai_quality_issues.length > 0 && (
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                  )}
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Document Detail Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedDoc && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {documentTypeLabels[selectedDoc.document_type] || selectedDoc.document_type}
                </DialogTitle>
                <DialogDescription>
                  Status: {selectedDoc.verification_status}
                  {selectedDoc.ai_confidence_score !== null && ` • AI: ${selectedDoc.ai_confidence_score}%`}
                </DialogDescription>
              </DialogHeader>

              {/* Document Image */}
              <DocumentPreviewInline url={selectedDoc.file_url} />

              {/* AI Issues */}
              {selectedDoc.ai_quality_issues && selectedDoc.ai_quality_issues.length > 0 && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <p className="text-sm font-medium text-orange-400 mb-2">⚠️ AI-bevindingen</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {selectedDoc.ai_quality_issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedDoc.rejection_reason && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm font-medium text-red-400 mb-1">Reden afkeuring:</p>
                  <p className="text-sm text-muted-foreground">{selectedDoc.rejection_reason}</p>
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => reanalyzeMutation.mutate(selectedDoc)}
                  disabled={reanalyzeMutation.isPending}
                >
                  <Brain className="h-4 w-4 mr-1" />
                  {reanalyzeMutation.isPending ? 'Bezig...' : 'AI Analyse'}
                </Button>

                {selectedDoc.verification_status !== 'rejected' && (
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Afkeuren
                  </Button>
                )}

                {selectedDoc.verification_status !== 'verified' && (
                  <Button 
                    size="sm"
                    onClick={() => approveMutation.mutate(selectedDoc.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Goedkeuren
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document afkeuren</DialogTitle>
            <DialogDescription>
              Geef een reden op. De chauffeur ontvangt een notificatie.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Bijv: Document is onleesbaar..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuleren
            </Button>
            <Button 
              variant="destructive"
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
              onClick={() => {
                if (selectedDoc) {
                  rejectMutation.mutate({ docId: selectedDoc.id, reason: rejectionReason });
                }
              }}
            >
              Afkeuren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DocumentPreviewInline({ url }: { url: string | null }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUrl = async () => {
      if (!url) {
        setLoading(false);
        return;
      }
      if (url.includes('driver-documents')) {
        const pathMatch = url.match(/driver-documents\/(.+)/);
        if (pathMatch) {
          const { data } = await supabase.storage
            .from('driver-documents')
            .createSignedUrl(pathMatch[1], 3600);
          setSignedUrl(data?.signedUrl || url);
        }
      } else {
        setSignedUrl(url);
      }
      setLoading(false);
    };
    loadUrl();
  }, [url]);

  if (loading) {
    return (
      <div className="w-full h-48 rounded-lg bg-muted flex items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="w-full h-48 rounded-lg bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Geen afbeelding</p>
      </div>
    );
  }

  return (
    <img 
      src={signedUrl} 
      alt="Document" 
      className="w-full max-h-64 object-contain rounded-lg bg-muted"
    />
  );
}