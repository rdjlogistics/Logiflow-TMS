import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, Settings, FileText, Bell, Eye, Copy, Check, Package,
  Clock, MapPin, Palette, Globe, Loader2, Mail, AlertCircle, CheckCircle2, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface CustomerAccess {
  id: string;
  customerName: string;
  email: string;
  isActive: boolean;
  userId: string | null;
  hasPortalAccess: boolean;
}

interface EmailDomain {
  id: string;
  domain: string;
  senderEmail: string;
  senderName: string | null;
  status: string | null;
  dnsRecords: any;
  verifiedAt: string | null;
}

export default function CustomerSelfService() {
  const { isAdmin } = useUserRole();
  
  // DB-backed portal settings
  const [portalEnabled, setPortalEnabled] = useState(true);
  const [allowBooking, setAllowBooking] = useState(true);
  const [allowTracking, setAllowTracking] = useState(true);
  const [allowDocuments, setAllowDocuments] = useState(true);
  const [allowInvoices, setAllowInvoices] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Email domain
  const [emailDomain, setEmailDomain] = useState<EmailDomain | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [senderEmailInput, setSenderEmailInput] = useState("");
  const [senderNameInput, setSenderNameInput] = useState("");
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainVerifying, setDomainVerifying] = useState(false);

  // Customer access (real data)
  const [customers, setCustomers] = useState<CustomerAccess[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  
  // Invite dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteData, setInviteData] = useState({ email: "", customerName: "" });
  const [inviting, setInviting] = useState(false);

  // Edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerAccess | null>(null);

  const [copied, setCopied] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Fetch tenant id
  useEffect(() => {
    const fetchTenantId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();
      if (data) setTenantId(data.company_id);
    };
    fetchTenantId();
  }, []);

  // Fetch email domain
  const fetchEmailDomain = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("email_domains")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (data) {
      setEmailDomain({
        id: data.id,
        domain: data.domain,
        senderEmail: data.sender_email,
        senderName: data.sender_name,
        status: data.status,
        dnsRecords: data.dns_records,
        verifiedAt: data.verified_at,
      });
    } else {
      setEmailDomain(null);
    }
  }, [tenantId]);

  // Fetch customers with portal access
  const fetchCustomers = useCallback(async () => {
    if (!tenantId) return;
    setLoadingCustomers(true);
    
    const { data, error } = await supabase
      .from("customers")
      .select("id, company_name, email, is_active, user_id")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("company_name");

    if (error) {
      console.error("Error fetching customers:", error);
    } else {
      setCustomers(
        (data ?? []).map((c) => ({
          id: c.id,
          customerName: c.company_name,
          email: c.email || "",
          isActive: c.is_active ?? true,
          userId: c.user_id,
          hasPortalAccess: !!c.user_id,
        }))
      );
    }
    setLoadingCustomers(false);
  }, [tenantId]);

  // Load all data when tenantId is available
  useEffect(() => {
    if (!tenantId) return;
    fetchEmailDomain();
    fetchCustomers();
    setLoadingSettings(false);
  }, [tenantId, fetchEmailDomain, fetchCustomers]);

  const portalUrl = emailDomain?.domain
    ? `https://${emailDomain.domain}`
    : `${window.location.origin}/portal/b2b`;

  const copyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success("Link gekopieerd!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Save domain via Edge Function
  const handleSaveDomain = async () => {
    if (!domainInput || !senderEmailInput) {
      toast.error("Vul domein en afzender e-mail in");
      return;
    }
    setDomainSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-email-domain", {
        body: {
          action: "create",
          domain: domainInput,
          senderEmail: senderEmailInput,
          senderName: senderNameInput || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Domein aangemaakt! Configureer de DNS-records.");
      await fetchEmailDomain();
      setDomainInput("");
      setSenderEmailInput("");
      setSenderNameInput("");
    } catch (err: any) {
      console.error("Domain create error:", err);
      toast.error(err.message || "Kon domein niet aanmaken");
    } finally {
      setDomainSaving(false);
    }
  };

  // Verify domain (triggers verify + checks status)
  const handleVerifyDomain = async () => {
    if (!emailDomain) return;
    setDomainVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-email-domain", {
        body: { action: "verify", domain: emailDomain.domain },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.verified) {
        toast.success("Domein succesvol geverifieerd! E-mails worden nu vanuit uw domein verzonden.");
      } else {
        toast.info(data?.message || "DNS-records nog niet volledig geverifieerd. Controleer de records bij uw domeinprovider.");
      }
      await fetchEmailDomain();
    } catch (err: any) {
      console.error("Domain verify error:", err);
      toast.error(err.message || "Verificatie mislukt");
    } finally {
      setDomainVerifying(false);
    }
  };

  // Check domain status without triggering verify
  const handleCheckStatus = async () => {
    if (!emailDomain) return;
    setDomainVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-email-domain", {
        body: { action: "check" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.verified) {
        toast.success("Domein is geverifieerd!");
      } else {
        toast.info("Status bijgewerkt. DNS-records nog in afwachting.");
      }
      await fetchEmailDomain();
    } catch (err: any) {
      console.error("Domain check error:", err);
      toast.error(err.message || "Status check mislukt");
    } finally {
      setDomainVerifying(false);
    }
  };

  // Delete domain
  const handleDeleteDomain = async () => {
    if (!emailDomain) return;
    if (!confirm("Weet u zeker dat u dit domein wilt verwijderen? E-mails worden dan weer vanuit het standaard adres verzonden.")) return;
    
    setDomainSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-email-domain", {
        body: { action: "delete" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Domein verwijderd");
      setEmailDomain(null);
    } catch (err: any) {
      console.error("Domain delete error:", err);
      toast.error(err.message || "Kon domein niet verwijderen");
    } finally {
      setDomainSaving(false);
    }
  };

  // Invite customer via Edge Function
  const handleInviteCustomer = async () => {
    if (!inviteData.email || !inviteData.customerName) {
      toast.error("Vul alle velden in");
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-customer-portal-account", {
        body: {
          email: inviteData.email,
          customerName: inviteData.customerName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Uitnodiging verzonden naar ${inviteData.email}`);
      setShowInviteDialog(false);
      setInviteData({ email: "", customerName: "" });
      await fetchCustomers();
    } catch (err: any) {
      console.error("Invite error:", err);
      toast.error(err.message || "Uitnodiging mislukt");
    } finally {
      setInviting(false);
    }
  };

  // Toggle customer active status
  const handleToggleCustomerActive = async (customer: CustomerAccess) => {
    const newStatus = !customer.isActive;
    const { error } = await supabase
      .from("customers")
      .update({ is_active: newStatus })
      .eq("id", customer.id);
    
    if (error) {
      toast.error("Kon status niet wijzigen");
    } else {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, isActive: newStatus } : c))
      );
      toast.success(`${customer.customerName} ${newStatus ? "geactiveerd" : "gedeactiveerd"}`);
    }
  };

  const stats = {
    totalCustomers: customers.length,
    activeUsers: customers.filter((c) => c.isActive && c.hasPortalAccess).length,
    withAccess: customers.filter((c) => c.hasPortalAccess).length,
  };

  const getDomainStatusBadge = (status: string | null) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Geverifieerd</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="h-3 w-3 mr-1" />In afwachting</Badge>;
      default:
        return <Badge variant="secondary">{status || "Onbekend"}</Badge>;
    }
  };

  if (loadingSettings) {
    return (
      <DashboardLayout title="Customer Self-Service" description="Beheer uw klantenportaal">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Customer Self-Service" description="Beheer uw klantenportaal en toegangsrechten">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                  <p className="text-sm text-muted-foreground">Totaal klanten</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.withAccess}</p>
                  <p className="text-sm text-muted-foreground">Met portaaltoegang</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Eye className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                  <p className="text-sm text-muted-foreground">Actieve portaalgebruikers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portal Link */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Klantenportaal URL</h3>
                  <p className="text-sm text-muted-foreground">{portalUrl}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? "Gekopieerd!" : "Kopieer"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="customers">
          <TabsList>
            <TabsTrigger value="customers">Klant Toegang</TabsTrigger>
            <TabsTrigger value="domain">E-mail Domein</TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Klant Toegang</CardTitle>
                    <CardDescription>Beheer welke klanten toegang hebben tot het portaal</CardDescription>
                  </div>
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Klant Uitnodigen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingCustomers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>Nog geen klanten. Nodig uw eerste klant uit.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Klant</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Portaal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.customerName}</TableCell>
                          <TableCell className="text-sm">{customer.email || "—"}</TableCell>
                          <TableCell>
                            {customer.hasPortalAccess ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-200">Toegang</Badge>
                            ) : (
                              <Badge variant="secondary">Geen account</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={customer.isActive ? "default" : "secondary"}>
                              {customer.isActive ? "Actief" : "Inactief"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {!customer.hasPortalAccess && customer.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setInviteData({ email: customer.email, customerName: customer.customerName });
                                  setShowInviteDialog(true);
                                }}
                              >
                                <Mail className="h-3.5 w-3.5 mr-1" />
                                Uitnodigen
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleCustomerActive(customer)}
                            >
                              {customer.isActive ? "Deactiveren" : "Activeren"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domain">
            <Card>
              <CardHeader>
                <CardTitle>E-mail Domein Koppeling</CardTitle>
                <CardDescription>
                  Koppel uw eigen domein zodat e-mails vanuit uw bedrijfsnaam worden verzonden
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {emailDomain ? (
                  <>
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="font-medium">{emailDomain.domain}</p>
                          <p className="text-sm text-muted-foreground">
                            Afzender: {emailDomain.senderName ? `${emailDomain.senderName} <${emailDomain.senderEmail}>` : emailDomain.senderEmail}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getDomainStatusBadge(emailDomain.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={handleDeleteDomain}
                            disabled={domainSaving}
                          >
                            Verwijderen
                          </Button>
                        </div>
                      </div>
                    </div>

                    {emailDomain.status !== "verified" && (
                      <>
                        {emailDomain.dnsRecords && Array.isArray(emailDomain.dnsRecords) && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Voeg deze DNS-records toe bij uw domeinprovider:</p>
                            <div className="rounded-lg border overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Naam</TableHead>
                                    <TableHead>Waarde</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(emailDomain.dnsRecords as any[]).map((record: any, i: number) => (
                                    <TableRow key={i}>
                                      <TableCell className="font-mono text-xs">{record.type}</TableCell>
                                      <TableCell className="font-mono text-xs break-all max-w-[200px]">{record.name || record.host}</TableCell>
                                      <TableCell className="font-mono text-xs break-all max-w-[300px]">{record.value || record.data}</TableCell>
                                      <TableCell>
                                        {record.status === "verified" ? (
                                          <Badge variant="outline" className="text-xs">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />OK
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary" className="text-xs">
                                            <Clock className="h-3 w-3 mr-1" />Wachtend
                                          </Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              DNS-wijzigingen kunnen tot 72 uur duren om door te voeren.
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Button onClick={handleVerifyDomain} disabled={domainVerifying}>
                            {domainVerifying ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            DNS Verifiëren
                          </Button>
                          <Button onClick={handleCheckStatus} disabled={domainVerifying} variant="outline">
                            Status Controleren
                          </Button>
                        </div>
                      </>
                    )}

                    {emailDomain.status === "verified" && (
                      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-500/10 dark:border-green-500/20 p-4">
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">Domein geverifieerd en actief</p>
                          <p className="text-xs text-green-600/80 dark:text-green-400/60">
                            E-mails worden verzonden vanuit {emailDomain.senderEmail}
                            {emailDomain.verifiedAt && ` · Geverifieerd op ${new Date(emailDomain.verifiedAt).toLocaleDateString("nl-NL")}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Nog geen domein gekoppeld</p>
                        <p className="text-sm text-muted-foreground">
                          Koppel uw domein zodat klanten e-mails ontvangen vanuit uw bedrijfsnaam in plaats van het standaard adres.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Domein</Label>
                        <Input
                          value={domainInput}
                          onChange={(e) => setDomainInput(e.target.value)}
                          placeholder="mail.uwbedrijf.nl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Afzender e-mail</Label>
                        <Input
                          value={senderEmailInput}
                          onChange={(e) => setSenderEmailInput(e.target.value)}
                          placeholder="noreply@uwbedrijf.nl"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Afzender naam (optioneel)</Label>
                        <Input
                          value={senderNameInput}
                          onChange={(e) => setSenderNameInput(e.target.value)}
                          placeholder="Uw Bedrijfsnaam"
                        />
                      </div>
                    </div>

                    <Button onClick={handleSaveDomain} disabled={domainSaving || !domainInput || !senderEmailInput}>
                      {domainSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Globe className="h-4 w-4 mr-2" />
                      Domein Koppelen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Customer Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klant Uitnodigen</DialogTitle>
            <DialogDescription>
              Stuur een uitnodiging naar een klant om toegang te krijgen tot het portaal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCustomerName">Klantnaam</Label>
              <Input
                id="inviteCustomerName"
                value={inviteData.customerName}
                onChange={(e) => setInviteData({ ...inviteData, customerName: e.target.value })}
                placeholder="Bedrijfsnaam"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="klant@bedrijf.nl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handleInviteCustomer} disabled={inviting}>
              {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Mail className="h-4 w-4 mr-2" />
              Uitnodigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
