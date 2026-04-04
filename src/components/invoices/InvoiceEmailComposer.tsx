import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Send,
  FileText,
  Paperclip,
  Loader2,
  Plus,
  X,
  ScrollText,
} from "lucide-react";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { motion, AnimatePresence } from "framer-motion";

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

const pillVariants = {
  initial: { opacity: 0, scale: 0.85, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 500, damping: 30 } },
  exit: { opacity: 0, scale: 0.8, filter: "blur(4px)", transition: { duration: 0.2 } },
};

const shimmerVariants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: { repeat: Infinity, duration: 3, ease: 'linear', repeatDelay: 2 }
  }
};

// --- Types ---
interface InvoiceEmailComposerProps {
  invoiceId: string;
  onSuccess: () => void;
}

interface CustomerContact {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export function InvoiceEmailComposer({ invoiceId, onSuccess }: InvoiceEmailComposerProps) {
  const { toast } = useToast();
  const { data: tenantSettings } = useTenantSettings();
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [customEmail, setCustomEmail] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [attachments, setAttachments] = useState({ pdf: true, ubl: false });
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());

  // Fetch invoice data
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice-for-email", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`*, customers(id, company_name, email, contact_name, address, city, postal_code), companies(name, email)`)
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const customerId = (invoice?.customers as any)?.id;
  const { data: customerSettings } = useQuery({
    queryKey: ["customer-settings-attach-docs", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await supabase
        .from("customer_settings")
        .select("attach_documents_to_invoice")
        .eq("customer_id", customerId)
        .maybeSingle();
      if (error) { console.error(error); return null; }
      return data;
    },
    enabled: !!customerId,
  });

  const showDocAttachments = customerSettings?.attach_documents_to_invoice ?? tenantSettings?.attach_documents_to_invoice ?? false;
  const { data: orderDocuments } = useQuery({
    queryKey: ["invoice-order-documents", invoiceId],
    queryFn: async () => {
      const { data: lines } = await supabase
        .from("invoice_lines")
        .select("trip_id")
        .eq("invoice_id", invoiceId)
        .not("trip_id", "is", null);
      const tripIds = [...new Set((lines || []).map(l => l.trip_id).filter((id): id is string => id !== null && id !== undefined))];
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

  // Build contacts list
  const contacts: CustomerContact[] = [];
  if (invoice?.customers) {
    const customer = invoice.customers as { id: string; company_name: string; email: string; contact_name: string };
    if (customer.email) {
      contacts.push({ id: "primary", name: customer.contact_name || customer.company_name, email: customer.email, role: "Primair" });
    }
  }

  useEffect(() => {
    if (invoice && !emailSubject) {
      const customer = invoice.customers as { company_name: string; contact_name: string; email: string };
      const company = invoice.companies as { name: string };
      setEmailSubject(`Factuur ${invoice.invoice_number} - ${company?.name || ""}`);
      setEmailBody(`Geachte ${customer?.contact_name || customer?.company_name || "klant"},

Hierbij ontvangt u factuur ${invoice.invoice_number} ter hoogte van €${Number(invoice.total_amount).toFixed(2)}.

Wij verzoeken u vriendelijk het bedrag vóór ${new Date(invoice.due_date).toLocaleDateString("nl-NL")} over te maken.

Met vriendelijke groet,
${company?.name || ""}`);
      if (customer?.email) setSelectedRecipients(new Set([customer.email]));
    }
  }, [invoice, emailSubject]);

  useEffect(() => {
    if (showDocAttachments && orderDocuments && orderDocuments.length > 0) {
      setSelectedDocumentIds(new Set(orderDocuments.map((doc: any) => doc.id)));
    }
  }, [orderDocuments, showDocAttachments]);

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const recipients = Array.from(selectedRecipients);
      if (customEmail) recipients.push(customEmail);
      if (recipients.length === 0) throw new Error("Selecteer minimaal één ontvanger");

      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          invoice_id: invoiceId,
          recipient_emails: recipients,
          email_subject: emailSubject,
          email_body: emailBody,
          include_pdf: attachments.pdf,
          include_ubl: attachments.ubl,
          document_ids: Array.from(selectedDocumentIds),
        },
      });

      if (error) {
        const httpStatus = (error as any)?.context?.status;
        if (error.message?.includes("RESEND") || error.message?.includes("email") || httpStatus === 500) {
          await supabase.from("invoices").update({ status: "verzonden", sent_at: new Date().toISOString() }).eq("id", invoiceId);
          throw new Error("E-mail service niet beschikbaar. Factuurstatus bijgewerkt naar 'Verzonden'. Stuur de factuur handmatig via uw e-mailprogramma.");
        }
        throw error;
      }
      if (data?.success === false && data?.warning) {
        throw new Error(data.warning + " Stuur de factuur handmatig via uw e-mailprogramma.");
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: "Factuur verzonden", description: "De factuur is succesvol per email verzonden." });
      onSuccess();
    },
    onError: (error) => {
      const isGraceful = error.message?.includes("handmatig");
      toast({
        title: isGraceful ? "E-mail service niet beschikbaar" : "Fout bij verzenden",
        description: error.message,
        variant: isGraceful ? "default" : "destructive",
      });
      if (isGraceful) onSuccess();
    },
  });

  const toggleRecipient = (email: string) => {
    const next = new Set(selectedRecipients);
    next.has(email) ? next.delete(email) : next.add(email);
    setSelectedRecipients(next);
  };

  const addCustomEmail = () => {
    if (customEmail && customEmail.includes("@")) {
      const next = new Set(selectedRecipients);
      next.add(customEmail);
      setSelectedRecipients(next);
      setCustomEmail("");
      setShowCustomInput(false);
    }
  };

  const removeRecipient = (email: string) => {
    const next = new Set(selectedRecipients);
    next.delete(email);
    setSelectedRecipients(next);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
        >
          <Loader2 className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Factuur niet gevonden</p>
      </div>
    );
  }

  const hasRecipients = selectedRecipients.size > 0 || customEmail;

  return (
    <motion.div
     
     
      className="relative rounded-2xl overflow-hidden border border-border/30 shadow-xl"
      style={{
        background: 'hsl(var(--card) / 0.55)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      }}
    >
      {/* Top highlight line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {/* Left edge highlight */}
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/20 via-transparent to-transparent" />

      {/* Animated shimmer */}
      <motion.div
       
       
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.03] to-transparent pointer-events-none"
      />

      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.06),transparent)] pointer-events-none" />

      {/* ── Header ── */}
      <motion.div
        className="relative px-6 py-5 border-b border-border/20"
      >
        <div className="flex items-center gap-4">
          <motion.div
            className="relative flex items-center justify-center w-12 h-12 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))',
              boxShadow: '0 0 24px -8px hsl(var(--primary) / 0.25)',
            }}

          >
            <Mail className="h-5 w-5 text-primary" />
            <div className="absolute inset-0 rounded-xl bg-primary/5 blur-xl animate-pulse" />
          </motion.div>
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">E-mail Versturen</h2>
            <p className="text-sm text-muted-foreground">
              Factuur {invoice.invoice_number} naar de klant
            </p>
          </div>
        </div>
      </motion.div>

      <div className="relative p-6 space-y-5">
        {/* ── Recipients ── */}
        <motion.div className="space-y-2.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aan</Label>
          <div
            className="flex flex-wrap items-center gap-2 p-3 min-h-[52px] rounded-xl border border-border/20 transition-all duration-200 focus-within:border-primary/30 focus-within:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.12)]"
            style={{
              background: 'hsl(var(--card) / 0.4)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <AnimatePresence mode="popLayout">
              {Array.from(selectedRecipients).map((email) => {
                const contact = contacts.find(c => c.email === email);
                return (
                  <motion.div
                    key={email}
                   
                   
                    exit="exit"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-primary/20"
                    style={{
                      background: 'hsl(var(--primary) / 0.1)',
                      backdropFilter: 'blur(8px)',
                      color: 'hsl(var(--primary))',
                    }}
                  >
                    <span>{contact?.name || email}</span>
                    <motion.button
                      onClick={() => removeRecipient(email)}
                      className="rounded-full p-0.5 transition-colors hover:bg-primary/20"

                    >
                      <X className="h-3.5 w-3.5" />
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {!showCustomInput ? (
              <div className="flex items-center gap-2">
                {contacts.filter(c => !selectedRecipients.has(c.email)).map((contact) => (
                  <motion.button
                    key={contact.id}
                    onClick={() => toggleRecipient(contact.email)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-border/40 rounded-full text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-200"

                  >
                    <Plus className="h-3.5 w-3.5" />
                    {contact.name}
                  </motion.button>
                ))}
                <motion.button
                  onClick={() => setShowCustomInput(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-border/40 rounded-full text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-200"

                >
                  <Plus className="h-3.5 w-3.5" />
                  Ander adres
                </motion.button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-2 flex-1 min-w-[200px]"
              >
                <Input
                  type="email"
                  placeholder="email@voorbeeld.nl"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomEmail()}
                  className="h-8 text-sm bg-transparent border-border/30 focus-visible:border-primary/40"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={addCustomEmail} className="h-8 px-2">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowCustomInput(false); setCustomEmail(""); }} className="h-8 px-2">
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── Subject ── */}
        <motion.div className="space-y-2.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Onderwerp</Label>
          <Input
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Onderwerp van de e-mail"
            className="h-11 rounded-xl border-border/20 bg-card/40 backdrop-blur-sm focus-visible:border-primary/30 focus-visible:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.12)] transition-all duration-200"
          />
        </motion.div>

        {/* ── Message ── */}
        <motion.div className="space-y-2.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bericht</Label>
          <Textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={8}
            placeholder="Schrijf uw bericht..."
            className="resize-none text-sm leading-relaxed rounded-xl border-border/20 bg-card/40 backdrop-blur-sm focus-visible:border-primary/30 focus-visible:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.12)] transition-all duration-200"
          />
        </motion.div>

        {/* ── Attachments ── */}
        <motion.div className="space-y-3">
          <div className="flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bijlagen</Label>
          </div>
          <div className="flex items-center gap-4">
            {[
              { key: "pdf" as const, label: "Factuur PDF", icon: <FileText className="h-4 w-4 text-destructive/70" /> },
              { key: "ubl" as const, label: "UBL XML", icon: <FileText className="h-4 w-4 text-primary/70" /> },
            ].map((att) => (
              <motion.label
                key={att.key}
                className="flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg border border-border/15 transition-all duration-200 hover:border-primary/25"
                style={{
                  background: attachments[att.key] ? 'hsl(var(--primary) / 0.04)' : 'transparent',
                }}

              >
                <Checkbox
                  checked={attachments[att.key]}
                  onCheckedChange={(checked) => setAttachments({ ...attachments, [att.key]: checked as boolean })}
                />
                {att.icon}
                <span className="text-sm text-foreground">{att.label}</span>
              </motion.label>
            ))}
          </div>

          {/* Order documents */}
          <AnimatePresence>
            {showDocAttachments && orderDocuments && orderDocuments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2 overflow-hidden"
              >
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Order Documenten</p>
                {orderDocuments.map((doc: any) => (
                  <motion.label
                    key={doc.id}
                    className="flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg border border-border/15 transition-all duration-200 hover:border-primary/25"
                    style={{
                      background: selectedDocumentIds.has(doc.id) ? 'hsl(var(--primary) / 0.04)' : 'transparent',
                    }}

                  >
                    <Checkbox
                      checked={selectedDocumentIds.has(doc.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedDocumentIds);
                        if (checked) next.add(doc.id); else next.delete(doc.id);
                        setSelectedDocumentIds(next);
                      }}
                    />
                    <ScrollText className="h-4 w-4 text-emerald-500/80" />
                    <span className="text-sm text-foreground">{doc.name || doc.document_type}</span>
                  </motion.label>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Footer / Send ── */}
      <motion.div
        className="relative px-6 py-4 border-t border-border/20"
        style={{
          background: 'hsl(var(--card) / 0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <motion.button
          className="relative w-full h-12 rounded-xl font-medium text-base text-primary-foreground overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-shadow duration-300"
          style={{
            background: hasRecipients
              ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))'
              : 'hsl(var(--muted))',
            boxShadow: hasRecipients ? '0 8px 32px -8px hsl(var(--primary) / 0.35)' : 'none',
          }}
          onClick={() => sendEmailMutation.mutate()}
          disabled={sendEmailMutation.isPending || !hasRecipients}

        >
          {/* Button shimmer */}
          {hasRecipients && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
              initial={{ x: '-100%' }}
            />
          )}

          <span className="relative z-10 flex items-center justify-center gap-2">
            {sendEmailMutation.isPending ? (
              <>
                <motion.div>
                  <Loader2 className="h-5 w-5" />
                </motion.div>
                Verzenden...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Factuur Versturen
              </>
            )}
          </span>
        </motion.button>

        <AnimatePresence>
          {!hasRecipients && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-muted-foreground text-center mt-2.5"
            >
              Voeg minimaal één ontvanger toe om te versturen
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
