import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Send,
  Loader2,
  X,
  Plus,
  FileText,
  CheckCircle2,
  Keyboard,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { hapticSelection, hapticSuccess, hapticError } from "@/lib/haptics";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { ScrollText } from "lucide-react";

interface PurchaseInvoiceEmailComposerProps {
  invoiceId: string;
  onSuccess?: () => void;
}

const pillVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 }
};

export const PurchaseInvoiceEmailComposer = ({
  invoiceId,
  onSuccess,
}: PurchaseInvoiceEmailComposerProps) => {
  const { data: tenantSettings } = useTenantSettings();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [includePdf, setIncludePdf] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    if (newEmail.length > 0) {
      setEmailValid(validateEmail(newEmail));
    } else {
      setEmailValid(null);
    }
  }, [newEmail]);

  // Fetch invoice details
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["purchase-invoice-email", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select(`
          *,
          carriers(id, company_name, email, contact_name)
        `)
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  // Fetch order documents linked to this purchase invoice's trips
  const showDocAttachments = tenantSettings?.attach_documents_to_purchase_invoice ?? false;
  const { data: orderDocuments } = useQuery({
    queryKey: ["purchase-invoice-order-documents", invoiceId],
    queryFn: async () => {
      const { data: lines } = await supabase
        .from("purchase_invoice_lines")
        .select("trip_id")
        .eq("purchase_invoice_id", invoiceId)
        .not("trip_id", "is", null);

      const tripIds = [...new Set((lines || []).map((l: any) => l.trip_id).filter(Boolean))];
      if (tripIds.length === 0) return [];

      const { data: docs } = await supabase
        .from("order_documents")
        .select("id, name, document_type, created_at")
        .in("order_id", tripIds)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      return docs || [];
    },
    enabled: showDocAttachments,
  });

  // Fetch company info for email template
  const { data: company } = useQuery({
    queryKey: ["user-company-info"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("user_companies")
        .select("companies(company_name)")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle();
      
      return (data?.companies as any)?.company_name || "Uw transportbedrijf";
    },
  });

  // Initialize form when invoice loads
  useEffect(() => {
    if (invoice && !initialized) {
      const carrier = invoice.carriers as any;
      
      // Set default recipients
      if (carrier?.email) {
        setRecipients([carrier.email]);
      }
      
      // Set default subject
      const periodText = invoice.period_from && invoice.period_to
        ? ` | Periode ${format(new Date(invoice.period_from), "d MMM", { locale: nl })} - ${format(new Date(invoice.period_to), "d MMM yyyy", { locale: nl })}`
        : "";
      setSubject(`Inkoopfactuur ${invoice.invoice_number}${periodText}`);
      
      // Set default body
      const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
      
      setBody(
        `Beste ${carrier?.contact_name || carrier?.company_name || "Charter"},

Hierbij ontvangt u een overzicht van de door u verrichte ritten${invoice.period_from && invoice.period_to ? ` voor de periode ${format(new Date(invoice.period_from), "d MMMM", { locale: nl })} t/m ${format(new Date(invoice.period_to), "d MMMM yyyy", { locale: nl })}` : ""}.

Factuurnummer: ${invoice.invoice_number}
Totaalbedrag: ${formatCurrency(Number(invoice.total_amount))}

U kunt dit bedrag bij ons declareren.

Met vriendelijke groet,
${company || "Uw transportbedrijf"}`
      );
      
      setInitialized(true);
    }
  }, [invoice, initialized, company]);

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (recipients.length === 0) {
        throw new Error("Voeg minimaal één ontvanger toe");
      }
      if (!subject.trim()) {
        throw new Error("Onderwerp is verplicht");
      }

      setIsSending(true);

      const { data, error } = await supabase.functions.invoke("send-purchase-invoice-email", {
        body: {
          purchase_invoice_id: invoiceId,
          recipient_emails: recipients,
          email_subject: subject,
          email_body: body,
          include_pdf: includePdf,
          document_ids: Array.from(selectedDocumentIds),
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const successCount = data.results?.filter((r: any) => r.success).length || 0;
      hapticSuccess();
      setIsSending(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      hapticError();
      setIsSending(false);
      toast.error(error.message || "Kon e-mail niet versturen");
    },
  });

  // Keyboard shortcut: ⌘+Enter to send
  const handleSend = useCallback(() => {
    if (recipients.length > 0 && !sendEmailMutation.isPending) {
      sendEmailMutation.mutate();
    }
  }, [recipients, sendEmailMutation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSend]);

  const addRecipient = () => {
    if (!newEmail.trim()) return;
    
    if (!validateEmail(newEmail)) {
      hapticError();
      toast.error("Ongeldig e-mailadres");
      return;
    }
    
    if (recipients.includes(newEmail)) {
      toast.error("E-mailadres is al toegevoegd");
      return;
    }
    
    hapticSelection();
    setRecipients([...recipients, newEmail]);
    setNewEmail("");
    setEmailValid(null);
  };

  const removeRecipient = (email: string) => {
    hapticSelection();
    setRecipients(recipients.filter((r) => r !== email));
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 shadow-xl shadow-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 shadow-xl shadow-primary/5">
      {/* Top gradient highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <motion.div
          >
            <Mail className="h-5 w-5 text-primary" />
          </div>
          E-mail versturen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recipients - iOS-style pills */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Aan</Label>
          
          <div className="min-h-[44px] p-2 rounded-xl border-2 border-input bg-background/50 backdrop-blur-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <div className="flex flex-wrap gap-2">
              
                {recipients.map((email) => (
                  <motion.div
                    key={email}
                   
                   
                    exit="exit"
                  >
                    <Badge 
                      variant="secondary" 
                      className="gap-1.5 pl-3 pr-1.5 py-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors touch-manipulation"
                    >
                      <Mail className="h-3 w-3" />
                      <span className="max-w-[150px] truncate">{email}</span>
                      <button
                        onClick={() => removeRecipient(email)}
                        className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors active:scale-90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                ))}
              
              
              {/* Add email input inline */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="E-mailadres toevoegen..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRecipient())}
                  className={cn(
                    "border-0 shadow-none focus-visible:ring-0 h-8 px-2 bg-transparent",
                    emailValid === true && "text-emerald-600",
                    emailValid === false && "text-destructive"
                  )}
                />
                {emailValid === true && (
                  <motion.div
                    initial={{ scale: 0 }}
                    className="flex-shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                )}
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={addRecipient}
                  disabled={!emailValid}
                  className="h-8 w-8 flex-shrink-0 touch-manipulation active:scale-95"
                >
                  <motion.div
                  >
                    <Plus className="h-4 w-4" />
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Gradient separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Subject */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Onderwerp</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Onderwerp van de e-mail"
            className="h-11"
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Bericht</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {body.length} tekens
            </span>
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tekst van de e-mail..."
            rows={8}
            className="font-mono text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            De factuurgegevens worden automatisch als tabel aan de e-mail toegevoegd.
          </p>
        </div>

        {/* Gradient separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Attachments - Premium checkbox */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Bijlagen</Label>
          <label
            htmlFor="include-pdf"
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all touch-manipulation",
              includePdf 
                ? "border-primary/30 bg-primary/5" 
                : "border-input hover:border-border/80 bg-background/50"
            )}
          >
            <Checkbox
              id="include-pdf"
              checked={includePdf}
              onCheckedChange={(checked) => {
                hapticSelection();
                setIncludePdf(checked === true);
              }}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <div className="flex items-center gap-2 flex-1">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                includePdf ? "bg-primary/20" : "bg-muted"
              )}>
                <FileText className={cn(
                  "h-4 w-4 transition-colors",
                  includePdf ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <span className="text-sm font-medium">
                Inkoopfactuur PDF bijvoegen
              </span>
            </div>
            {includePdf && (
              <motion.div
                initial={{ scale: 0 }}
              >
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
            )}
          </label>

          {/* Order documents */}
          {showDocAttachments && orderDocuments && orderDocuments.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Order Documenten</p>
              {orderDocuments.map((doc: any) => (
                <label
                  key={doc.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all touch-manipulation",
                    selectedDocumentIds.has(doc.id)
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-input hover:border-border/80 bg-background/50"
                  )}
                >
                  <Checkbox
                    checked={selectedDocumentIds.has(doc.id)}
                    onCheckedChange={(checked) => {
                      hapticSelection();
                      const next = new Set(selectedDocumentIds);
                      if (checked) next.add(doc.id); else next.delete(doc.id);
                      setSelectedDocumentIds(next);
                    }}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      selectedDocumentIds.has(doc.id) ? "bg-emerald-500/20" : "bg-muted"
                    )}>
                      <ScrollText className={cn(
                        "h-4 w-4 transition-colors",
                        selectedDocumentIds.has(doc.id) ? "text-emerald-600" : "text-muted-foreground"
                      )} />
                    </div>
                    <span className="text-sm font-medium">{doc.name || doc.document_type}</span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Gradient separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Send Button - Premium design */}
        <div className="space-y-3">
          <Button
            className={cn(
              "w-full h-12 gap-2 text-base font-semibold rounded-xl transition-all touch-manipulation active:scale-[0.98]",
              "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400",
              "shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30",
              "disabled:from-muted disabled:to-muted disabled:shadow-none"
            )}
            onClick={() => sendEmailMutation.mutate()}
            disabled={sendEmailMutation.isPending || recipients.length === 0}
          >
            
              {sendEmailMutation.isPending ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ opacity: 0, scale: 0.8 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Send className="h-5 w-5" />
                </div>
              )}
            
            Verstuur naar {recipients.length} ontvanger{recipients.length !== 1 ? "s" : ""}
          </Button>
          
          {/* Keyboard shortcut hint */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Keyboard className="h-3 w-3" />
            <span>Druk</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">⌘</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Enter</kbd>
            <span>om te versturen</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
