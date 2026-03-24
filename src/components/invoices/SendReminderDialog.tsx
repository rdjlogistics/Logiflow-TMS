import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Send, 
  AlertCircle,
  Clock,
  Euro,
  Eye,
  Edit2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCompany } from "@/hooks/useCompany";
import { AnimatePresence, motion } from "framer-motion";

// ---------- types ----------

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  due_date: string;
  status: string;
  reminder_count?: number;
  customers?: {
    company_name?: string;
    email?: string;
    phone?: string;
  };
}

interface SendReminderDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ReminderType = "first" | "second" | "third" | "custom";
type Channel = "email" | "whatsapp" | "sms";

// ---------- templates (mirrors Edge Function) ----------

interface ChannelTemplate {
  subject?: string;
  body: string;
}

interface ReminderTemplate {
  email: ChannelTemplate;
  whatsapp: ChannelTemplate;
  sms: ChannelTemplate;
}

const REMINDER_TEMPLATES: Record<Exclude<ReminderType, "custom">, ReminderTemplate> = {
  first: {
    email: {
      subject: "Herinnering: factuur {invoiceNumber} nog open",
      body: `Beste {customerName},

Wij willen u vriendelijk herinneren dat factuur {invoiceNumber} ter waarde van €{amount} nog openstaat. De vervaldatum was {dueDate}.

Mocht u de betaling al hebben verricht, dan kunt u dit bericht als niet verzonden beschouwen.

U kunt eenvoudig betalen via de volgende link:
{paymentLink}

Met vriendelijke groet,
{companyName}`,
    },
    whatsapp: {
      body: `Beste {customerName}, dit is een vriendelijke herinnering dat factuur {invoiceNumber} (€{amount}) nog openstaat. Vervaldatum was {dueDate}. Betaal via: {paymentLink} — {companyName}`,
    },
    sms: {
      body: `Herinnering: factuur {invoiceNumber} (€{amount}) is nog open. Vervaldatum: {dueDate}. Betaal via: {paymentLink} — {companyName}`,
    },
  },
  second: {
    email: {
      subject: "Dringende herinnering: factuur {invoiceNumber}",
      body: `Beste {customerName},

Ondanks onze eerdere herinnering hebben wij nog geen betaling ontvangen voor factuur {invoiceNumber} ter waarde van €{amount}. De vervaldatum was {dueDate}.

Wij verzoeken u dringend om de betaling zo spoedig mogelijk te voldoen.

Betaal direct via:
{paymentLink}

Neem bij vragen gerust contact met ons op.

Met vriendelijke groet,
{companyName}`,
    },
    whatsapp: {
      body: `Beste {customerName}, wij hebben nog geen betaling ontvangen voor factuur {invoiceNumber} (€{amount}, vervallen op {dueDate}). Wij verzoeken u dringend te betalen via: {paymentLink} — {companyName}`,
    },
    sms: {
      body: `Dringend: factuur {invoiceNumber} (€{amount}) is nog onbetaald sinds {dueDate}. Betaal a.u.b. via: {paymentLink} — {companyName}`,
    },
  },
  third: {
    email: {
      subject: "Aanmaning: factuur {invoiceNumber} — laatste verzoek",
      body: `Beste {customerName},

Dit is onze laatste herinnering betreffende factuur {invoiceNumber} ter waarde van €{amount}, vervallen op {dueDate}.

Indien wij binnen 7 dagen geen betaling ontvangen, zijn wij genoodzaakt de vordering uit handen te geven aan een incassobureau. De eventuele bijkomende kosten zijn dan voor uw rekening.

Betaal direct via:
{paymentLink}

Met vriendelijke groet,
{companyName}`,
    },
    whatsapp: {
      body: `Aanmaning: factuur {invoiceNumber} (€{amount}) is nog steeds onbetaald (vervallen {dueDate}). Zonder betaling binnen 7 dagen worden incassomaatregelen genomen. Betaal via: {paymentLink} — {companyName}`,
    },
    sms: {
      body: `AANMANING: factuur {invoiceNumber} (€{amount}) onbetaald. Betaal binnen 7 dagen via: {paymentLink} om incasso te voorkomen. — {companyName}`,
    },
  },
};

// ---------- helpers ----------

function applyTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

// ---------- component ----------

export function SendReminderDialog({ 
  invoice, 
  open, 
  onOpenChange,
  onSuccess 
}: SendReminderDialogProps) {
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(["email"]);
  const [reminderType, setReminderType] = useState<ReminderType>("first");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [activePreviewTab, setActivePreviewTab] = useState<Channel>("email");

  const { company } = useCompany();

  if (!invoice) return null;

  const daysOverdue = differenceInDays(new Date(), new Date(invoice.due_date));
  const hasEmail = !!invoice.customers?.email;
  const hasPhone = !!invoice.customers?.phone;

  const companyName = company?.name || "Uw bedrijf";

  const templateVars: Record<string, string> = {
    customerName: invoice.customers?.company_name || "Klant",
    invoiceNumber: invoice.invoice_number,
    amount: invoice.total_amount.toLocaleString("nl-NL", { minimumFractionDigits: 2 }),
    dueDate: format(new Date(invoice.due_date), "d MMMM yyyy", { locale: nl }),
    companyName,
    paymentLink: "[betaallink wordt automatisch toegevoegd]",
  };

  // Resolve the preview content for a given channel
  const getPreview = (channel: Channel): { subject?: string; body: string } => {
    if (reminderType === "custom") {
      return { body: customMessage || "(typ uw bericht hierboven)" };
    }
    if (isEditing) {
      return { 
        subject: REMINDER_TEMPLATES[reminderType].email.subject 
          ? applyTemplate(REMINDER_TEMPLATES[reminderType].email.subject!, templateVars) 
          : undefined,
        body: editedBody,
      };
    }
    const tpl = REMINDER_TEMPLATES[reminderType][channel];
    return {
      subject: "subject" in tpl ? applyTemplate(tpl.subject!, templateVars) : undefined,
      body: applyTemplate(tpl.body, templateVars),
    };
  };

  const previewChannels = selectedChannels.length > 0 ? selectedChannels : ["email" as Channel];

  const toggleChannel = (channel: Channel) => {
    setSelectedChannels(prev => {
      const next = prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel];
      // Keep activePreviewTab in sync
      if (!next.includes(activePreviewTab) && next.length > 0) {
        setActivePreviewTab(next[0]);
      }
      return next;
    });
  };

  const startEditing = () => {
    const currentPreview = getPreview(activePreviewTab);
    setEditedBody(currentPreview.body);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedBody("");
  };

  const confirmEdit = () => {
    setReminderType("custom");
    setCustomMessage(editedBody);
    setIsEditing(false);
    setEditedBody("");
  };

  const handleSend = async () => {
    if (selectedChannels.length === 0) {
      toast.error("Selecteer minimaal één kanaal");
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Niet ingelogd");
      }

      const channel = selectedChannels.length === 1 
        ? selectedChannels[0] 
        : selectedChannels.length > 1 ? "all" : "email";

      const response = await supabase.functions.invoke("send-invoice-reminder", {
        body: {
          invoiceId: invoice.id,
          channel,
          reminderType,
          customMessage: reminderType === "custom" ? customMessage : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;

      if (result.success) {
        toast.success(result.message || "Herinnering verzonden");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Verzenden mislukt");
      }
    } catch (error) {
      console.error("Send reminder error:", error);
      toast.error("Fout bij verzenden herinnering");
    } finally {
      setIsSending(false);
    }
  };

  const channelIcon = (ch: Channel) => {
    if (ch === "email") return <Mail className="h-3.5 w-3.5" />;
    if (ch === "whatsapp") return <MessageSquare className="h-3.5 w-3.5" />;
    return <Phone className="h-3.5 w-3.5" />;
  };

  const channelLabel = (ch: Channel) => {
    if (ch === "email") return "Email";
    if (ch === "whatsapp") return "WhatsApp";
    return "SMS";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Herinnering versturen
          </DialogTitle>
          <DialogDescription>
            Stuur een betalingsherinnering voor factuur {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Invoice Summary */}
          <div className="p-4 rounded-xl bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{invoice.customers?.company_name}</span>
              <Badge variant={daysOverdue > 30 ? "destructive" : daysOverdue > 0 ? "warning" : "outline"}>
                {daysOverdue > 0 ? `${daysOverdue} dagen achterstallig` : "Nog niet vervallen"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Euro className="h-3 w-3" />
                €{invoice.total_amount.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Vervaldatum: {format(new Date(invoice.due_date), "d MMMM yyyy", { locale: nl })}
              </span>
            </div>
            {invoice.reminder_count && invoice.reminder_count > 0 && (
              <p className="text-xs text-muted-foreground">
                Al {invoice.reminder_count} herinnering(en) verzonden
              </p>
            )}
          </div>

          {/* Channel Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Verzendkanaal</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => hasEmail && toggleChannel("email")}
                disabled={!hasEmail}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all active:scale-[0.97]",
                  selectedChannels.includes("email") 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50",
                  !hasEmail && "opacity-50 cursor-not-allowed"
                )}
              >
                <Mail className={cn(
                  "h-5 w-5",
                  selectedChannels.includes("email") ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-xs font-medium">Email</span>
                {!hasEmail && (
                  <span className="text-[10px] text-destructive">Geen email</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => hasPhone && toggleChannel("whatsapp")}
                disabled={!hasPhone}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all active:scale-[0.97]",
                  selectedChannels.includes("whatsapp") 
                    ? "border-green-500 bg-green-500/5" 
                    : "border-border hover:border-green-500/50",
                  !hasPhone && "opacity-50 cursor-not-allowed"
                )}
              >
                <MessageSquare className={cn(
                  "h-5 w-5",
                  selectedChannels.includes("whatsapp") ? "text-green-500" : "text-muted-foreground"
                )} />
                <span className="text-xs font-medium">WhatsApp</span>
                {!hasPhone && (
                  <span className="text-[10px] text-destructive">Geen telefoon</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => hasPhone && toggleChannel("sms")}
                disabled={!hasPhone}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all active:scale-[0.97]",
                  selectedChannels.includes("sms") 
                    ? "border-blue-500 bg-blue-500/5" 
                    : "border-border hover:border-blue-500/50",
                  !hasPhone && "opacity-50 cursor-not-allowed"
                )}
              >
                <Phone className={cn(
                  "h-5 w-5",
                  selectedChannels.includes("sms") ? "text-blue-500" : "text-muted-foreground"
                )} />
                <span className="text-xs font-medium">SMS</span>
                {!hasPhone && (
                  <span className="text-[10px] text-destructive">Geen telefoon</span>
                )}
              </button>
            </div>
          </div>

          <Separator />

          {/* Reminder Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Type herinnering</Label>
            <RadioGroup 
              value={reminderType} 
              onValueChange={(v) => {
                setReminderType(v as ReminderType);
                setIsEditing(false);
                setEditedBody("");
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="first" id="first" />
                <Label htmlFor="first" className="font-normal cursor-pointer">
                  Eerste herinnering <span className="text-muted-foreground">(vriendelijk)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="second" id="second" />
                <Label htmlFor="second" className="font-normal cursor-pointer">
                  Tweede herinnering <span className="text-muted-foreground">(dringend)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="third" id="third" />
                <Label htmlFor="third" className="font-normal cursor-pointer">
                  Laatste herinnering <span className="text-muted-foreground">(aanmaning)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Aangepast bericht
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Custom Message */}
          {reminderType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customMessage">Bericht</Label>
              <Textarea
                id="customMessage"
                placeholder="Typ hier uw aangepaste bericht..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Het bericht wordt automatisch aangevuld met factuurgegevens en betaallink.
              </p>
            </div>
          )}

          {/* Warning for aggressive reminder */}
          {reminderType === "third" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-600">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                Dit is een aanmaning met vermelding van mogelijke incassomaatregelen. 
                Zorg ervoor dat dit gepast is voor de situatie.
              </p>
            </div>
          )}

          <Separator />

          {/* Message Preview */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${reminderType}-${activePreviewTab}-${isEditing}`}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    Berichtvoorbeeld
                  </Label>
                  {reminderType !== "custom" && !isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={startEditing}
                    >
                      <Edit2 className="h-3 w-3" />
                      Bewerken
                    </Button>
                  )}
                </div>

                {/* Channel tabs if multiple selected */}
                {previewChannels.length > 1 && (
                  <Tabs 
                    value={activePreviewTab} 
                    onValueChange={(v) => setActivePreviewTab(v as Channel)}
                  >
                    <TabsList className="h-8">
                      {previewChannels.map(ch => (
                        <TabsTrigger key={ch} value={ch} className="text-xs gap-1 px-2.5 h-6">
                          {channelIcon(ch)}
                          {channelLabel(ch)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}

                {/* Preview card */}
                <div className="rounded-xl border border-border/50 bg-muted/30 backdrop-blur-sm overflow-hidden">
                  {(() => {
                    const preview = getPreview(
                      previewChannels.includes(activePreviewTab) ? activePreviewTab : previewChannels[0]
                    );

                    return (
                      <div className="p-4 space-y-2">
                        {preview.subject && (
                          <div className="pb-2 border-b border-border/30">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">Onderwerp</p>
                            <p className="text-sm font-medium">{preview.subject}</p>
                          </div>
                        )}

                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editedBody}
                              onChange={(e) => setEditedBody(e.target.value)}
                              className="min-h-[140px] text-sm resize-y bg-background/60"
                              autoFocus
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={cancelEditing}
                              >
                                <X className="h-3 w-3" />
                                Annuleren
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={confirmEdit}
                              >
                                Overnemen als aangepast bericht
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                            {preview.body}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <p className="text-[11px] text-muted-foreground/70">
                  Dit is een preview — het daadwerkelijke bericht kan kleine verschillen bevatten (betaallink, opmaak).
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending || selectedChannels.length === 0}
            className="active:scale-[0.97]"
          >
            {isSending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Verzenden...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Verzenden via {selectedChannels.length} kanaal{selectedChannels.length !== 1 ? "en" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
