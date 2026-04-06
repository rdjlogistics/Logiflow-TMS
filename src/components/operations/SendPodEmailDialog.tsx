import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, Mail, FileText, CheckCircle2, Image, File } from "lucide-react";
import { cn } from "@/lib/utils";

const spring = { type: "spring" as const, stiffness: 300, damping: 25 };

interface OrderDocument {
  id: string;
  name: string;
  document_type: string;
  url: string;
  mime_type: string | null;
  file_size: number | null;
}

interface SendPodEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  orderNumber: string;
  customerEmail?: string | null;
  defaultDocumentType?: string;
  stopProofId?: string;
  isDemo?: boolean;
}

const getDocIcon = (mimeType: string | null) => {
  if (mimeType?.startsWith('image/')) return Image;
  if (mimeType?.includes('pdf')) return FileText;
  return File;
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function SendPodEmailDialog({ open, onOpenChange, tripId, orderNumber, customerEmail, defaultDocumentType, stopProofId, isDemo }: SendPodEmailDialogProps) {
  const [email, setEmail] = useState(customerEmail || '');
  const [documentType, setDocumentType] = useState<string>(defaultDocumentType || 'vrachtbrief');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Document attachments
  const [publicDocs, setPublicDocs] = useState<OrderDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && tripId) {
      setEmail(customerEmail || '');
      setDocumentType(defaultDocumentType || 'vrachtbrief');
      setSent(false);
      fetchPublicDocuments();
    }
  }, [open, tripId, customerEmail, defaultDocumentType]);

  const fetchPublicDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('order_documents')
        .select('id, name, document_type, url, mime_type, file_size, is_public')
        .eq('order_id', tripId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const docs = data || [];
      setPublicDocs(docs);
      // Default ON for customer emails (conform EasyTrans)
      setSelectedDocIds(new Set(docs.map(d => d.id)));
    } catch (err) {
      console.error('Error fetching public documents:', err);
      setPublicDocs([]);
    }
  };

  const toggleDoc = (docId: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleSend = async () => {
    if (!email) {
      toast.error('Vul een e-mailadres in');
      return;
    }
    if (isDemo) {
      toast.info('Dit is een demo-order. Maak een echte order aan om documenten te versturen.');
      return;
    }

    setSending(true);
    try {
      let documentUrl = '';
      let documentHtml = '';
      try {
        if (documentType === 'pod' && stopProofId) {
          const { data: podData, error: podError } = await supabase.functions.invoke('generate-pod-pdf', {
            body: { stop_proof_id: stopProofId },
          });
          if (podError) {
            console.warn('POD PDF generatie mislukt:', podError);
          } else if (podData?.html) {
            documentHtml = podData.html;
          }
        } else {
          const { data: genData, error: genError } = await supabase.functions.invoke('generate-document-pdf', {
            body: { orderId: tripId, documentType, copies: ['sender', 'receiver', 'carrier'], language: 'nl' },
          });
          if (genError) {
            console.warn('Document generatie mislukt:', genError);
          } else {
            documentHtml = genData?.html || '';
            documentUrl = genData?.url || '';
          }
        }
      } catch (genErr) {
        console.warn('Document generatie mislukt, e-mail wordt zonder document verstuurd:', genErr);
      }

      // Generate signed URLs for selected attachments
      const attachmentUrls: string[] = [];
      for (const docId of selectedDocIds) {
        const doc = publicDocs.find(d => d.id === docId);
        if (doc?.url) {
          if (doc.url.startsWith('http')) {
            attachmentUrls.push(doc.url);
          } else {
            const { data: signed } = await supabase.storage
              .from('order-documents')
              .createSignedUrl(doc.url, 60 * 60 * 24 * 7);
            if (signed?.signedUrl) attachmentUrls.push(signed.signedUrl);
          }
        }
      }

      if (!documentUrl && attachmentUrls.length === 0) {
        toast.warning('Document kon niet worden gegenereerd. E-mail wordt zonder documentlink verstuurd.');
      }

      const { error: sendError } = await supabase.functions.invoke('send-document-email', {
        body: { to: email, documentUrl, documentType, orderNumber, recipientType: 'customer', attachmentUrls, message: message || undefined },
      });
      if (sendError) throw sendError;

      setSent(true);
      const typeLabels: Record<string, string> = { pod: 'POD', vrachtbrief: 'Vrachtbrief', transportopdracht: 'Transportopdracht' };
      toast.success(`${typeLabels[documentType] || documentType} verstuurd naar ${email}`);
      setTimeout(() => {
        onOpenChange(false);
        setSent(false);
      }, 1500);
    } catch (err: any) {
      console.error('Send email error:', err);
      toast.error('Versturen mislukt', { description: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/40 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            Verstuur naar klant
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              transition={spring}
              className="py-10 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                className="inline-flex p-4 rounded-full bg-emerald-500/10 mb-4"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </motion.div>
              <p className="font-semibold text-lg">Verstuurd!</p>
              <p className="text-sm text-muted-foreground mt-1">Document is verzonden naar {email}</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              transition={spring}
              className="space-y-4 py-2"
            >
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  E-mailadres
                </Label>
                <Input
                  type="email"
                  placeholder="klant@voorbeeld.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl h-10 border-border/50 bg-muted/20 focus:bg-background transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Document type
                </Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="rounded-xl h-10 border-border/50 bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="pod">Proof of Delivery (POD)</SelectItem>
                    <SelectItem value="vrachtbrief">Vrachtbrief</SelectItem>
                    <SelectItem value="transportopdracht">Transportopdracht</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Document attachments */}
              {publicDocs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Bijgevoegde documenten
                  </Label>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                    {publicDocs.map((doc, i) => {
                      const Icon = getDocIcon(doc.mime_type);
                      return (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, x: -8 }}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer",
                            selectedDocIds.has(doc.id)
                              ? "bg-primary/5 border-primary/20"
                              : "bg-muted/10 border-border/30 hover:bg-muted/20"
                          )}
                          onClick={() => toggleDoc(doc.id)}
                        >
                          <Checkbox
                            checked={selectedDocIds.has(doc.id)}
                            onCheckedChange={() => toggleDoc(doc.id)}
                          />
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.document_type}{doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Bericht (optioneel)</Label>
                <Textarea
                  placeholder="Optioneel bericht voor de klant..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="rounded-xl border-border/50 bg-muted/20 focus:bg-background transition-colors resize-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!sent && (
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending} className="rounded-xl">
              Annuleren
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={sending || !email} 
              className={cn("gap-2 rounded-xl min-w-[120px]", !email && "opacity-50")}
            >
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Versturen...</>
              ) : (
                <><Send className="h-4 w-4" />Versturen</>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
