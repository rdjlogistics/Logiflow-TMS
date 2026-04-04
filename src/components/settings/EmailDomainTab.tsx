import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Mail, Globe, Shield, CheckCircle2, XCircle, Clock, Copy, RefreshCw, Trash2, Loader2, AlertTriangle, Info, ArrowRight, Sparkles, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  priority: number | null;
  status: string;
  ttl: string;
}

interface EmailDomain {
  id: string;
  tenant_id: string;
  domain: string;
  sender_email: string;
  sender_name: string;
  resend_domain_id: string | null;
  status: string;
  dns_records: DnsRecord[];
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const EmailDomainTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [emailDomain, setEmailDomain] = useState<EmailDomain | null>(null);

  const fetchDomain = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('email_domains').select('*').limit(1).maybeSingle();
      if (error) throw error;
      if (data) {
        setEmailDomain(data as unknown as EmailDomain);
        setDomain(data.domain);
        setSenderEmail(data.sender_email);
        setSenderName(data.sender_name || '');
      }
    } catch (err) {
      console.error('Error fetching email domain:', err);
      toast({ title: 'Fout bij ophalen e-maildomeinen', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDomain(); }, [fetchDomain]);

  const handleCreateDomain = async () => {
    if (!domain || !senderEmail) { toast({ title: 'Vul alle velden in', variant: 'destructive' }); return; }
    const emailDomainPart = senderEmail.split('@')[1];
    if (emailDomainPart?.toLowerCase() !== domain.toLowerCase()) { toast({ title: 'E-mailadres moet eindigen op @' + domain, variant: 'destructive' }); return; }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-email-domain', {
        body: { action: 'create', domain, senderEmail, senderName: senderName || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Domein geregistreerd', description: 'Voeg nu de DNS-records toe bij je domeinprovider.' });
      await fetchDomain();
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-email-domain', { body: { action: 'check' } });
      if (error) throw error;
      if (data?.domain) {
        setEmailDomain(data.domain);
        const isVerified = data.domain.status === 'verified';
        toast({
          title: isVerified ? '✅ Domein geverifieerd!' : '⏳ Nog niet volledig geverifieerd',
          description: isVerified ? 'Alle emails worden nu verstuurd vanaf jouw domein.' : 'Controleer of alle DNS-records correct zijn ingesteld.',
        });
      }
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const handleVerify = async () => {
    setChecking(true);
    try {
      const { error } = await supabase.functions.invoke('manage-email-domain', { body: { action: 'verify' } });
      if (error) throw error;
      toast({ title: 'Verificatie gestart', description: 'Even geduld, status wordt gecontroleerd...' });
      setTimeout(async () => { await handleCheckStatus(); }, 3000);
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
      setChecking(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!emailDomain?.sender_email) return;
    setTestingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          action: 'test',
          to: emailDomain.sender_email,
          subject: 'Test e-mail van LogiFlow TMS',
          body: `Dit is een test e-mail verstuurd vanaf ${emailDomain.sender_email} om te bevestigen dat uw e-maildomein correct is geconfigureerd.`,
        },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || 'Onbekende fout');
      toast({ title: 'Test e-mail verzonden', description: `Check je inbox op ${emailDomain.sender_email}` });
    } catch (err: any) {
      toast({ title: 'Test e-mail mislukt', description: err.message || 'Controleer of RESEND_API_KEY is ingesteld.', variant: 'destructive' });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('manage-email-domain', { body: { action: 'delete' } });
      if (error) throw error;
      setEmailDomain(null); setDomain(''); setSenderEmail(''); setSenderName('');
      toast({ title: 'Domein verwijderd' });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Gekopieerd', description: 'Waarde gekopieerd naar klembord.' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"><CheckCircle2 className="h-3 w-3 mr-1" /> Geverifieerd</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Mislukt</Badge>;
      default:
        return <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"><Clock className="h-3 w-3 mr-1" /> In afwachting</Badge>;
    }
  };

  const getRecordStatusIcon = (status: string) => {
    if (status === 'verified') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Setup Card */}
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base md:text-lg">E-mail Afzenderdomein</CardTitle>
              <CardDescription>Configureer een eigen afzenderadres voor alle uitgaande emails</CardDescription>
            </div>
            {emailDomain && getStatusBadge(emailDomain.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {emailDomain ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Domein', icon: Globe, value: emailDomain.domain },
                  { label: 'Afzender e-mail', icon: Mail, value: emailDomain.sender_email },
                  { label: 'Afzender naam', icon: Sparkles, value: emailDomain.sender_name },
                ].map(item => (
                  <div key={item.label} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{item.label}</Label>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card/40 backdrop-blur-sm border border-border/30">
                      <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs md:text-sm truncate">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleVerify} disabled={checking} variant="default" size="sm">
                  {checking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Verificatie Controleren
                </Button>
                <Button onClick={handleSendTestEmail} disabled={testingEmail || emailDomain?.status !== 'verified'} variant="outline" size="sm" title={emailDomain?.status !== 'verified' ? 'Domein moet eerst geverifieerd zijn' : ''}>
                  {testingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Test E-mail Sturen
                </Button>
                <Button onClick={handleDeleteClick} disabled={deleting} variant="destructive" size="sm">
                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Verwijderen
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Eigen e-maildomein koppelen</p>
                    <p className="text-xs text-muted-foreground">
                      Door een eigen domein te koppelen worden alle emails verstuurd vanaf jouw eigen e-mailadres.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="domain">Domein *</Label>
                  <Input id="domain" value={domain} onChange={(e) => { setDomain(e.target.value); if (senderEmail && !senderEmail.includes('@')) setSenderEmail(senderEmail + '@' + e.target.value); }} placeholder="jouwbedrijf.nl" className="text-base md:text-sm text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senderEmail">Afzender e-mailadres *</Label>
                  <Input id="senderEmail" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder={`noreply@${domain || 'jouwbedrijf.nl'}`} className="text-base md:text-sm text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senderName">Afzender naam</Label>
                  <Input id="senderName" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Mijn Bedrijf" className="text-base md:text-sm text-base" />
                </div>
              </div>
              <Button onClick={handleCreateDomain} disabled={saving || !domain || !senderEmail} className="btn-premium">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Domein Koppelen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DNS Records Card */}
        {emailDomain && emailDomain.dns_records && (emailDomain.dns_records as DnsRecord[]).length > 0 && (
          <div>
            <Card variant="glass">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base md:text-lg">DNS Records</CardTitle>
                    <CardDescription>Voeg deze records toe bij je domeinprovider</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mobile: card-based DNS records */}
                <div className="space-y-3 md:hidden">
                  {(emailDomain.dns_records as DnsRecord[]).map((record, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-[10px]">{record.type}</Badge>
                        <div className="flex items-center gap-2">
                          {getRecordStatusIcon(record.status)}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(record.value)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">Host</p>
                        <p className="font-mono text-[11px] break-all">{record.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">Waarde</p>
                        <p className="font-mono text-[11px] break-all">{record.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: table-based DNS records */}
                <div className="hidden md:block rounded-xl border border-border/30 overflow-hidden">
                  <div className="grid grid-cols-[60px_1fr_1fr_50px_40px] gap-2 p-3 bg-muted/20 text-xs font-medium text-muted-foreground border-b border-border/30">
                    <span>Type</span>
                    <span>Host / Naam</span>
                    <span>Waarde</span>
                    <span>Status</span>
                    <span></span>
                  </div>
                  {(emailDomain.dns_records as DnsRecord[]).map((record, i) => (
                    <div
                      key={i}
                      className={cn(
                        "grid grid-cols-[60px_1fr_1fr_50px_40px] gap-2 p-3 items-center text-xs",
                        i < (emailDomain.dns_records as DnsRecord[]).length - 1 && "border-b border-border/20"
                      )}
                    >
                      <Badge variant="outline" className="font-mono text-[10px] justify-center">{record.type}</Badge>
                      <div className="font-mono text-[11px] truncate" title={record.name}>{record.name}</div>
                      <div className="font-mono text-[11px] truncate" title={record.value}>{record.value}</div>
                      <div className="flex justify-center">{getRecordStatusIcon(record.status)}</div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(record.value)} title="Kopieer waarde">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Instructions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Stap-voor-stap instructies
                  </h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {[
                      'Log in bij je domeinprovider (bijv. TransIP, Cloudflare, Hostnet, Versio, GoDaddy)',
                      <>Ga naar DNS-beheer voor het domein <strong>{emailDomain.domain}</strong></>,
                      'Voeg alle bovenstaande records toe. Gebruik de kopieerknop om de waarden over te nemen',
                      'Wacht tot DNS-propagatie voltooid is (kan tot 48 uur duren, meestal binnen 15 minuten)',
                      <>Klik op <strong>"Verificatie Controleren"</strong> om te bevestigen dat alles correct is ingesteld</>,
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] shrink-0">{i + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {emailDomain.status !== 'verified' && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Zolang het domein niet geverifieerd is, worden emails verstuurd vanaf het standaard platform-adres.
                        Na verificatie worden alle emails automatisch verstuurd vanaf <strong>{emailDomain.sender_email}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {emailDomain.status === 'verified' && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Alle emails worden nu verstuurd vanaf <strong>{emailDomain.sender_name} &lt;{emailDomain.sender_email}&gt;</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="E-maildomein verwijderen"
        description="Weet je zeker dat je het e-maildomein wilt verwijderen? Alle e-mailinstellingen gaan verloren."
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  );
};
