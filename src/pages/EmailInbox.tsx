import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useEmailOrderIntake } from "@/hooks/useEmailOrderIntake";
import {
  Mail, MailOpen, Search, RefreshCw, Inbox, Send as SendIcon,
  Clock, Paperclip, ChevronRight, Circle, Bot, CheckCircle,
  XCircle, ArrowRight, Truck, AlertTriangle, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

type InboundEmail = {
  id: string;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  html_body: string | null;
  text_body: string | null;
  attachments: Array<{ filename: string; content_type: string; size: number }>;
  received_at: string;
  read: boolean;
  starred: boolean;
};

type SentEmail = {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  email_subject: string | null;
  email_body: string | null;
  delivery_status: string;
  created_at: string;
  invoices?: { invoice_number: string } | null;
};

function IntakeStatusBadge({ status, confidence }: { status: string; confidence: number | null }) {
  const conf = confidence ?? 0;
  if (status === "order_created" && conf >= 0.8) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">✓ Order</Badge>;
  if (status === "order_created") return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">⚠ Review</Badge>;
  if (status === "confirmed") return <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Bevestigd</Badge>;
  if (status === "dispatched") return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">Verzonden</Badge>;
  if (status === "ignored") return <Badge variant="secondary" className="text-[10px]">Genegeerd</Badge>;
  if (status === "failed") return <Badge variant="destructive" className="text-[10px]">Mislukt</Badge>;
  return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
}

export default function EmailInbox() {
  const [tab, setTab] = useState<"inbox" | "sent" | "ai-intake">("inbox");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { intakes, isLoading: loadingIntake, stats, confirmMutation, rejectMutation, refetch: refetchIntake } = useEmailOrderIntake();

  // Fetch inbound emails
  const { data: inbox = [], isLoading: loadingInbox, refetch: refetchInbox } = useQuery({
    queryKey: ["inbound-emails"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inbound_emails")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as InboundEmail[];
    },
  });

  // Fetch sent emails
  const { data: sent = [], isLoading: loadingSent, refetch: refetchSent } = useQuery({
    queryKey: ["sent-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_email_log")
        .select("*, invoices(invoice_number)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as SentEmail[];
    },
  });

  // Mark as read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("inbound_emails").update({ read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbound-emails"] }),
  });

  const handleSelect = (id: string) => {
    setSelected(id);
    if (tab === "inbox") {
      const email = inbox.find((e) => e.id === id);
      if (email && !email.read) markReadMutation.mutate(id);
    }
  };

  const unreadCount = inbox.filter((e) => !e.read).length;

  const filteredInbox = inbox.filter((e) => {
    const q = search.toLowerCase();
    return !q || e.from_email?.toLowerCase().includes(q) || e.subject?.toLowerCase().includes(q) || e.text_body?.toLowerCase().includes(q);
  });

  const filteredSent = sent.filter((e) => {
    const q = search.toLowerCase();
    return !q || e.recipient_email?.toLowerCase().includes(q) || e.email_subject?.toLowerCase().includes(q);
  });

  const selectedEmail =
    tab === "inbox" ? inbox.find((e) => e.id === selected) :
    tab === "sent" ? sent.find((e) => e.id === selected) : null;

  const selectedIntake = tab === "ai-intake" ? intakes.find(i => i.id === selected) : null;

  return (
    <DashboardLayout title="E-mail Inbox">
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-border flex flex-col bg-card">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                E-mail
                {unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs">{unreadCount}</Badge>
                )}
              </h1>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { refetchInbox(); refetchSent(); refetchIntake(); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            value={tab}
            onValueChange={(value) => {
              const nextTab = value as "inbox" | "sent" | "ai-intake";
              setTab(nextTab);
              setSelected(null);

              if (nextTab === "inbox") refetchInbox();
              if (nextTab === "sent") refetchSent();
              if (nextTab === "ai-intake") refetchIntake();
            }}
          >
            <TabsList className="w-full rounded-none border-b border-border bg-transparent h-10">
              <TabsTrigger value="inbox" className="flex-1 gap-1">
                <Inbox className="h-3.5 w-3.5" />
                Inbox
                {unreadCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5">{unreadCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex-1 gap-1">
                <SendIcon className="h-3.5 w-3.5" />
                Sent
              </TabsTrigger>
              <TabsTrigger value="ai-intake" className="flex-1 gap-1">
                <Bot className="h-3.5 w-3.5" />
                AI
                {stats.needs_review > 0 && <span className="bg-amber-500 text-white text-[10px] rounded-full px-1.5">{stats.needs_review}</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {/* Inbox tab */}
            {tab === "inbox" && (
              <>
                {loadingInbox ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Laden...</div>
                ) : filteredInbox.length === 0 ? (
                  <div className="p-8 text-center">
                    <MailOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Geen berichten ontvangen</p>
                  </div>
                ) : (
                  filteredInbox.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => handleSelect(email.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors",
                        selected === email.id && "bg-primary/5 border-l-2 border-l-primary",
                        !email.read && "bg-blue-50/50 dark:bg-blue-950/20"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-1">
                          {email.read ? <MailOpen className="h-4 w-4 text-muted-foreground" /> : <Circle className="h-4 w-4 text-primary fill-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={cn("text-sm truncate", !email.read && "font-semibold")}>{email.from_name || email.from_email}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(email.received_at), "d MMM", { locale: nl })}</span>
                          </div>
                          <p className={cn("text-sm truncate mt-0.5", !email.read ? "font-medium text-foreground" : "text-muted-foreground")}>{email.subject || "(geen onderwerp)"}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{email.text_body?.slice(0, 80) || ""}</p>
                          {email.attachments?.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{email.attachments.length} bijlage(n)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}

            {/* Sent tab */}
            {tab === "sent" && (
              <>
                {loadingSent ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Laden...</div>
                ) : filteredSent.length === 0 ? (
                  <div className="p-8 text-center">
                    <SendIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nog geen e-mails verstuurd</p>
                  </div>
                ) : (
                  filteredSent.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => handleSelect(email.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors",
                        selected === email.id && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-medium truncate">{email.recipient_email}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(email.created_at), "d MMM", { locale: nl })}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{email.email_subject || "(geen onderwerp)"}</p>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}

            {/* AI Intake tab */}
            {tab === "ai-intake" && (
              <>
                {loadingIntake ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Laden...</div>
                ) : intakes.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nog geen AI intake verwerkt</p>
                    <p className="text-xs text-muted-foreground mt-1">E-mails met transportopdrachten worden automatisch herkend</p>
                  </div>
                ) : (
                  intakes.map((intake) => (
                    <button
                      key={intake.id}
                      onClick={() => setSelected(intake.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors",
                        selected === intake.id && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {intake.status === "order_created" && (intake.ai_confidence ?? 0) >= 0.8 ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          ) : intake.status === "order_created" ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : intake.status === "confirmed" ? (
                            <Truck className="h-4 w-4 text-primary" />
                          ) : intake.status === "failed" ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-medium truncate">
                              {intake.inbound_emails?.from_name || intake.inbound_emails?.from_email || "Onbekend"}
                            </span>
                            <IntakeStatusBadge status={intake.status} confidence={intake.ai_confidence} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {intake.inbound_emails?.subject || "(geen onderwerp)"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {intake.ai_extracted_data?.pickup_city && intake.ai_extracted_data?.delivery_city && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                {intake.ai_extracted_data.pickup_city} <ArrowRight className="h-2.5 w-2.5" /> {intake.ai_extracted_data.delivery_city}
                              </span>
                            )}
                            {intake.ai_confidence != null && (
                              <span className={cn("text-[10px] font-mono", intake.ai_confidence >= 0.8 ? "text-emerald-500" : intake.ai_confidence >= 0.5 ? "text-amber-500" : "text-red-400")}>
                                {Math.round(intake.ai_confidence * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto bg-background">
          {/* AI Intake stats bar */}
          {tab === "ai-intake" && !selected && (
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <Card className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Totaal</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-500">{stats.auto_created}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Orders</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-500">{stats.needs_review}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Review</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{stats.avg_confidence}%</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Gem. zekerheid</p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center py-12">
                <Bot className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground">Selecteer een intake-item voor details</p>
              </div>
            </div>
          )}

          {/* AI Intake detail */}
          {tab === "ai-intake" && selectedIntake && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 max-w-3xl mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    AI Intake Detail
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Van: {selectedIntake.inbound_emails?.from_name || selectedIntake.inbound_emails?.from_email || "Onbekend"}
                  </p>
                </div>
                <IntakeStatusBadge status={selectedIntake.status} confidence={selectedIntake.ai_confidence} />
              </div>

              {/* Confidence bar */}
              {selectedIntake.ai_confidence != null && (
                <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">AI Zekerheid</span>
                    <span className={cn("font-bold", selectedIntake.ai_confidence >= 0.8 ? "text-emerald-500" : selectedIntake.ai_confidence >= 0.5 ? "text-amber-500" : "text-red-400")}>
                      {Math.round(selectedIntake.ai_confidence * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", selectedIntake.ai_confidence >= 0.8 ? "bg-emerald-500" : selectedIntake.ai_confidence >= 0.5 ? "bg-amber-500" : "bg-red-400")}
                      style={{ width: `${Math.round(selectedIntake.ai_confidence * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Extracted data */}
              {selectedIntake.ai_extracted_data && Object.keys(selectedIntake.ai_extracted_data).length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Geëxtraheerde gegevens</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(selectedIntake.ai_extracted_data)
                        .filter(([, v]) => v != null && v !== "")
                        .map(([key, value]) => (
                          <div key={key} className="p-3 rounded-xl bg-muted/20 border border-border/40">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                              {key.replace(/_/g, " ")}
                            </p>
                            <p className="text-sm font-semibold">{String(value)}</p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Linked order */}
              {selectedIntake.trips && (
                <Card className="border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Gekoppelde order: {selectedIntake.trips.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedIntake.trips.pickup_city} → {selectedIntake.trips.delivery_city} · Status: {selectedIntake.trips.status}
                      </p>
                    </div>
                    <Badge variant="outline">{selectedIntake.trips.status}</Badge>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {selectedIntake.status === "order_created" && (
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => confirmMutation.mutate(selectedIntake.id)}
                    loading={confirmMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Goedkeuren & Dispatch
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => rejectMutation.mutate(selectedIntake.id)}
                    loading={rejectMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Afwijzen
                  </Button>
                </div>
              )}

              {selectedIntake.error_message && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                  {selectedIntake.error_message}
                </div>
              )}
            </motion.div>
          )}

          {/* Regular email detail */}
          {!selected && tab !== "ai-intake" && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Mail className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground">Selecteer een e-mail om te lezen</p>
              </div>
            </div>
          )}

          {tab === "inbox" && selectedEmail && (
            <div className="p-6 max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">{(selectedEmail as InboundEmail).subject || "(geen onderwerp)"}</h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{(selectedEmail as InboundEmail).from_name || (selectedEmail as InboundEmail).from_email}</span>
                    <span>&lt;{(selectedEmail as InboundEmail).from_email}&gt;</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date((selectedEmail as InboundEmail).received_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
                  </div>
                </div>
              </div>
              <div className="border border-border rounded-xl p-6 bg-card min-h-64">
                {(selectedEmail as InboundEmail).html_body ? (
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((selectedEmail as InboundEmail).html_body!, { ALLOWED_TAGS: ['p','br','b','i','em','strong','a','ul','ol','li','h1','h2','h3','h4','h5','h6','span','div','table','tr','td','th','thead','tbody','img','blockquote','pre','code','hr'], ALLOWED_ATTR: ['href','src','alt','class','style','target','rel','width','height'], FORBID_TAGS: ['script','iframe','object','embed','form'], FORBID_ATTR: ['onerror','onload','onclick','onmouseover'] }) }}
                  />
                ) : (
                  <pre className="text-sm whitespace-pre-wrap font-sans">{(selectedEmail as InboundEmail).text_body || "(leeg bericht)"}</pre>
                )}
              </div>
              {(selectedEmail as InboundEmail).attachments?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-1"><Paperclip className="h-4 w-4" />Bijlagen</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedEmail as InboundEmail).attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />{att.filename}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "sent" && selectedEmail && (
            <div className="p-6 max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">{(selectedEmail as SentEmail).email_subject || "(geen onderwerp)"}</h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Aan: <span className="text-foreground font-medium">{(selectedEmail as SentEmail).recipient_email}</span></span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date((selectedEmail as SentEmail).created_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
                  </div>
                  <Badge variant={(selectedEmail as SentEmail).delivery_status === "sent" ? "default" : "destructive"} className="text-xs">
                    {(selectedEmail as SentEmail).delivery_status === "sent" ? "Verzonden" : (selectedEmail as SentEmail).delivery_status}
                  </Badge>
                </div>
              </div>
              <div className="border border-border rounded-xl p-6 bg-card min-h-64">
                <pre className="text-sm whitespace-pre-wrap font-sans">{(selectedEmail as SentEmail).email_body || "(leeg bericht)"}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
