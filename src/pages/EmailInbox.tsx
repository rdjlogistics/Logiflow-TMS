import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, MailOpen, Search, Star, RefreshCw, Inbox, Send as SendIcon,
  Clock, Paperclip, ChevronRight, Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

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

export default function EmailInbox() {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    return (
      !q ||
      e.from_email?.toLowerCase().includes(q) ||
      e.subject?.toLowerCase().includes(q) ||
      e.text_body?.toLowerCase().includes(q)
    );
  });

  const filteredSent = sent.filter((e) => {
    const q = search.toLowerCase();
    return (
      !q ||
      e.recipient_email?.toLowerCase().includes(q) ||
      e.email_subject?.toLowerCase().includes(q)
    );
  });

  const selectedEmail =
    tab === "inbox"
      ? inbox.find((e) => e.id === selected)
      : sent.find((e) => e.id === selected);

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
                E-mail Inbox
                {unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { refetchInbox(); refetchSent(); }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoeken..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => { setTab(v as "inbox" | "sent"); setSelected(null); }}>
            <TabsList className="w-full rounded-none border-b border-border bg-transparent h-10">
              <TabsTrigger value="inbox" className="flex-1 gap-1.5">
                <Inbox className="h-4 w-4" />
                Inbox
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex-1 gap-1.5">
                <SendIcon className="h-4 w-4" />
                Verzonden
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Email list */}
          <div className="flex-1 overflow-y-auto">
            {tab === "inbox" && (
              <>
                {loadingInbox ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Laden...</div>
                ) : filteredInbox.length === 0 ? (
                  <div className="p-8 text-center">
                    <MailOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Geen berichten ontvangen</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Stel je e-maildomein in via Instellingen → E-mail
                    </p>
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
                          {email.read ? (
                            <MailOpen className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Circle className="h-4 w-4 text-primary fill-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={cn("text-sm truncate", !email.read && "font-semibold")}>
                              {email.from_name || email.from_email}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(email.received_at), "d MMM", { locale: nl })}
                            </span>
                          </div>
                          <p className={cn("text-sm truncate mt-0.5", !email.read ? "font-medium text-foreground" : "text-muted-foreground")}>
                            {email.subject || "(geen onderwerp)"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {email.text_body?.slice(0, 80) || ""}
                          </p>
                          {email.attachments?.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {email.attachments.length} bijlage(n)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}

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
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(email.created_at), "d MMM", { locale: nl })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {email.email_subject || "(geen onderwerp)"}
                        </p>
                        {(email.invoices as any)?.invoice_number && (
                          <span className="text-xs text-blue-600 mt-0.5 block">
                            Factuur {(email.invoices as any).invoice_number}
                          </span>
                        )}
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
          {!selected ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Mail className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground">Selecteer een e-mail om te lezen</p>
              </div>
            </div>
          ) : tab === "inbox" && selectedEmail ? (
            <div className="p-6 max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">
                  {(selectedEmail as InboundEmail).subject || "(geen onderwerp)"}
                </h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">
                      {(selectedEmail as InboundEmail).from_name || (selectedEmail as InboundEmail).from_email}
                    </span>
                    <span>&lt;{(selectedEmail as InboundEmail).from_email}&gt;</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date((selectedEmail as InboundEmail).received_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
                  </div>
                </div>
                {(selectedEmail as InboundEmail).to_email && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Aan: {(selectedEmail as InboundEmail).to_email}
                  </p>
                )}
              </div>

              <div className="border border-border rounded-xl p-6 bg-card min-h-64">
                {(selectedEmail as InboundEmail).html_body ? (
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((selectedEmail as InboundEmail).html_body!, { ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img', 'blockquote', 'pre', 'code', 'hr'], ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target', 'rel', 'width', 'height'], FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'], FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'] }) }}
                  />
                ) : (
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {(selectedEmail as InboundEmail).text_body || "(leeg bericht)"}
                  </pre>
                )}
              </div>

              {(selectedEmail as InboundEmail).attachments?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Paperclip className="h-4 w-4" />
                    Bijlagen
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedEmail as InboundEmail).attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                        {att.filename}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : tab === "sent" && selectedEmail ? (
            <div className="p-6 max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">
                  {(selectedEmail as SentEmail).email_subject || "(geen onderwerp)"}
                </h2>
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
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {(selectedEmail as SentEmail).email_body || "(leeg bericht)"}
                </pre>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
