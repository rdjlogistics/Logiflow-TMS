import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Mail, AlertCircle, Send, CheckCircle2, FileText, Image, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { cn } from '@/lib/utils';

const spring = { type: "spring" as const, stiffness: 300, damping: 25 };

interface OrderDocument {
  id: string;
  name: string;
  document_type: string;
  url: string;
  mime_type: string | null;
  file_size: number | null;
  is_public: boolean;
}

interface SendTransportOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  carrierEmail?: string;
  carrierName?: string;
  onSuccess?: () => void;
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

export const SendTransportOrderDialog: React.FC<SendTransportOrderDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  carrierEmail = '',
  carrierName = '',
  onSuccess,
}) => {
  const { toast } = useToast();
  const { data: tenantSettings } = useTenantSettings();
  const [email, setEmail] = useState(carrierEmail);
  const [remark, setRemark] = useState('');
  const [includePurchasePrices, setIncludePurchasePrices] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Document attachments
  const [publicDocs, setPublicDocs] = useState<OrderDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(carrierEmail);
      setRemark('');
      setIncludePurchasePrices(tenantSettings?.show_purchase_price_to_driver ?? false);
      setSent(false);
      fetchPublicDocuments();
    }
  }, [open, carrierEmail, tenantSettings]);

  const fetchPublicDocuments = async () => {
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('order_documents')
        .select('id, name, document_type, url, mime_type, file_size, is_public')
        .eq('order_id', orderId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublicDocs(data || []);
      // Default OFF for transport orders (conform EasyTrans)
      setSelectedDocIds(new Set());
    } catch (err) {
      console.error('Error fetching public documents:', err);
      setPublicDocs([]);
    } finally {
      setLoadingDocs(false);
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
      toast({ title: 'Voer een e-mailadres in', variant: 'destructive' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: 'Ongeldig e-mailadres', variant: 'destructive' });
      return;
    }

    setIsSending(true);

    try {
      // Generate transportopdracht PDF
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-document-pdf', {
        body: {
          orderId: orderId,
          documentType: 'transportopdracht',
          includePurchasePrices,
          remark,
        },
      });
      if (pdfError) throw pdfError;

      const documentUrl = pdfData?.url || pdfData?.publicUrl || '';

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
              .createSignedUrl(doc.url, 60 * 60 * 24 * 7); // 7 days
            if (signed?.signedUrl) attachmentUrls.push(signed.signedUrl);
          }
        }
      }

      // Send email
      const { error: emailError } = await supabase.functions.invoke('send-document-email', {
        body: {
          to: email,
          documentUrl,
          documentType: 'transportopdracht',
          orderNumber,
          recipientType: 'driver',
          attachmentUrls,
        },
      });
      if (emailError) throw emailError;

      setSent(true);
      toast({ title: `Transportopdracht verstuurd naar ${email}` });
      setTimeout(() => {
        onOpenChange(false);
        setSent(false);
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      console.error('Send transport order error:', error);
      toast({
        title: 'Fout bij versturen',
        description: error.message || 'Probeer het opnieuw',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
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
            Transportopdracht versturen
          </DialogTitle>
          <DialogDescription>
            Order {orderNumber}{carrierName && ` — ${carrierName}`}
          </DialogDescription>
        </DialogHeader>
          {sent ? (
            <div
              key="success"
              className="py-10 text-center"
            >
              <div
                className="inline-flex p-4 rounded-full bg-emerald-500/10 mb-4"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <p className="font-semibold text-lg">Verstuurd!</p>
              <p className="text-sm text-muted-foreground mt-1">Transportopdracht verzonden naar {email}</p>
            </div>
          ) : (
            <div
              key="form"
              className="space-y-4 py-2"
            >
              {/* Email */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  E-mailadres charter
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="charter@voorbeeld.nl"
                  className="rounded-xl h-10 border-border/50 bg-muted/20 focus:bg-background transition-colors"
                />
                {!carrierEmail && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Geen e-mailadres gevonden bij charter.
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="include-prices"
                    checked={includePurchasePrices}
                    onCheckedChange={(checked) => setIncludePurchasePrices(checked === true)}
                  />
                  <Label htmlFor="include-prices" className="text-sm cursor-pointer">
                    Inkooptarieven vermelden
                  </Label>
                </div>
              </div>

              {/* Document attachments */}
              {publicDocs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Documenten bijvoegen
                  </Label>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {publicDocs.map((doc, i) => {
                      const Icon = getDocIcon(doc.mime_type);
                      return (
                        <div
                          key={doc.id}
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
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedDocIds.size} van {publicDocs.length} documenten geselecteerd
                  </p>
                </div>
              )}

              {/* Remark */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Opmerking (optioneel)</Label>
                <Textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Eventuele opmerking bij de transportopdracht..."
                  rows={2}
                  className="rounded-xl border-border/50 bg-muted/20 focus:bg-background transition-colors resize-none"
                />
              </div>
            </div>
          )}
        {!sent && (
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSending} className="rounded-xl">
              Annuleren
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !email}
              className={cn("gap-2 rounded-xl min-w-[120px]", !email && "opacity-50")}
            >
              {isSending ? (
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
};

export default SendTransportOrderDialog;
