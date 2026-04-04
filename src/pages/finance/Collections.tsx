import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreditControl } from "@/hooks/useCreditControl";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, Search, CreditCard, TrendingUp, Phone,
  Mail, Clock, CheckCircle2, XCircle, Euro, User,
  ChevronRight, Calendar, AlertCircle, Shield, Building2, Ban
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";


export function CollectionsContent() {
  const [activeTab, setActiveTab] = useState("collections");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseStatus, setCaseStatus] = useState<string>("");
  const [caseNote, setCaseNote] = useState<string>("");
  // Controlled state for credit profile dialog
  const [editCreditLimit, setEditCreditLimit] = useState<number>(0);
  const [editPaymentTerms, setEditPaymentTerms] = useState<number>(30);
  const [editRiskLevel, setEditRiskLevel] = useState<string>("low");
  const [editProforma, setEditProforma] = useState<boolean>(false);
  const [editStopShipping, setEditStopShipping] = useState<boolean>(false);
  const { toast } = useToast();

  const { creditProfiles, collectionCases, collectionStats, exposureStats, isLoading, updateCollectionCase, upsertCreditProfile, creditExposures } = useCreditControl();

  // Map collection cases to display format with joined data
  const displayCollections = collectionCases.map((c: any) => {
    const dueDate = c.invoices?.due_date || c.created_at;
    const daysOverdue = dueDate ? differenceInDays(new Date(), new Date(dueDate)) : 0;
    return {
      ...c,
      customer: c.customers?.company_name || "Onbekend",
      customer_phone: c.customers?.phone || null,
      customer_email: c.customers?.email || null,
      invoice: c.invoices?.invoice_number || c.invoice_id || "—",
      amount: c.invoices?.total_amount || c.promised_amount || 0,
      due_date: dueDate,
      days_overdue: Math.max(0, daysOverdue),
      owner: c.owner_user_id || "—",
    };
  });

  // Map credit profiles to display format with joined data
  const displayProfiles = creditProfiles.map((p: any) => {
    const exposure = creditExposures.find((e: any) => e.customer_id === p.customer_id);
    return {
      ...p,
      customer: p.customers?.company_name || "Onbekend",
      exposure: exposure?.exposure_total || 0,
      overdue: exposure?.overdue_amount || 0,
      payment_terms: p.payment_terms_days,
      proforma: p.proforma_required,
      stop_shipping: p.stop_shipping_on_overdue,
    };
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="destructive">Open</Badge>;
      case "contacted": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Gecontacteerd</Badge>;
      case "promised": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Belofte</Badge>;
      case "disputed": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Betwist</Badge>;
      case "escalated": return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Geëscaleerd</Badge>;
      case "paid": return <Badge variant="outline" className="text-green-500">Betaald</Badge>;
      case "closed": return <Badge variant="secondary">Gesloten</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "low": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Laag</Badge>;
      case "medium": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Midden</Badge>;
      case "high": return <Badge variant="destructive">Hoog</Badge>;
      default: return <Badge variant="outline">{risk}</Badge>;
    }
  };

  const getOverdueBucket = (days: number) => {
    if (days <= 7) return "0-7 dagen";
    if (days <= 14) return "8-14 dagen";
    if (days <= 30) return "15-30 dagen";
    return "30+ dagen";
  };

  const filteredCollections = displayCollections.filter((c: any) => {
    const matchesSearch = c.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.invoice?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalOverdue = displayCollections.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const buckets = {
    "0-7": displayCollections.filter((c: any) => (c.days_overdue || 0) <= 7).reduce((s: number, c: any) => s + (c.amount || 0), 0),
    "8-14": displayCollections.filter((c: any) => (c.days_overdue || 0) > 7 && (c.days_overdue || 0) <= 14).reduce((s: number, c: any) => s + (c.amount || 0), 0),
    "15-30": displayCollections.filter((c: any) => (c.days_overdue || 0) > 14 && (c.days_overdue || 0) <= 30).reduce((s: number, c: any) => s + (c.amount || 0), 0),
    "30+": displayCollections.filter((c: any) => (c.days_overdue || 0) > 30).reduce((s: number, c: any) => s + (c.amount || 0), 0),
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card variant="glass">
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Totaal Achterstallig</p>
                <p className="text-lg sm:text-2xl font-bold text-red-500 truncate">€{totalOverdue.toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Open Cases</p>
                <p className="text-lg sm:text-2xl font-bold">{collectionStats?.open || 0}</p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Beloftes</p>
                <p className="text-lg sm:text-2xl font-bold text-green-500">{collectionStats?.promised || 0}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Geëscaleerd</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-500">{collectionStats?.escalated || 0}</p>
              </div>
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Buckets */}
      <Card variant="glass" className="mb-6">
        <CardContent className="p-4 sm:pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-1">
                <span className="text-muted-foreground">0-7 dagen</span>
                <span className="font-medium">€{buckets["0-7"].toLocaleString()}</span>
              </div>
              <Progress value={(buckets["0-7"] / totalOverdue) * 100} className="h-2 bg-muted" />
            </div>
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-1">
                <span className="text-muted-foreground">8-14 dagen</span>
                <span className="font-medium">€{buckets["8-14"].toLocaleString()}</span>
              </div>
              <Progress value={(buckets["8-14"] / totalOverdue) * 100} className="h-2 bg-muted" />
            </div>
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-1">
                <span className="text-muted-foreground">15-30 dagen</span>
                <span className="font-medium text-amber-500">€{buckets["15-30"].toLocaleString()}</span>
              </div>
              <Progress value={(buckets["15-30"] / totalOverdue) * 100} className="h-2 bg-amber-500/20" />
            </div>
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-1">
                <span className="text-muted-foreground">30+ dagen</span>
                <span className="font-medium text-red-500">€{buckets["30+"].toLocaleString()}</span>
              </div>
              <Progress value={(buckets["30+"] / totalOverdue) * 100} className="h-2 bg-red-500/20" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="collections">
                    Incasso
                    <Badge variant="destructive" className="ml-2">{displayCollections.filter((c: any) => !['paid', 'closed'].includes(c.status)).length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="profiles">Kredietprofielen</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full text-base"
                />
              </div>
              {activeTab === "collections" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statussen</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="contacted">Gecontacteerd</SelectItem>
                    <SelectItem value="promised">Belofte</SelectItem>
                    <SelectItem value="disputed">Betwist</SelectItem>
                    <SelectItem value="escalated">Geëscaleerd</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {activeTab === "collections" && (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border/30">
                {filteredCollections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <AlertTriangle className="h-8 w-8" />
                    <p className="font-medium">Geen incasso cases</p>
                  </div>
                ) : filteredCollections.map((coll: any) => (
                  <div
                    key={coll.id}
                    onClick={() => setSelectedCase(coll)}
                    className="p-4 cursor-pointer active:bg-muted/30 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{coll.customer}</p>
                        <p className="text-xs font-mono text-muted-foreground">{coll.invoice}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <Badge variant={coll.days_overdue > 30 ? "destructive" : coll.days_overdue > 14 ? "default" : "secondary"} className="text-xs">
                          {coll.days_overdue}d
                        </Badge>
                        {getStatusBadge(coll.status)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Vervalt: {format(new Date(coll.due_date), "d MMM yyyy", { locale: nl })}
                      </span>
                      <span className="font-bold text-base tabular-nums">€{coll.amount?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Klant</TableHead>
                      <TableHead>Factuur</TableHead>
                      <TableHead className="text-right">Bedrag</TableHead>
                      <TableHead>Vervaldag</TableHead>
                      <TableHead>Dagen Over</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Eigenaar</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCollections.map((coll: any) => (
                      <TableRow key={coll.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedCase(coll)}>
                        <TableCell className="font-medium">{coll.customer}</TableCell>
                        <TableCell className="font-mono">{coll.invoice}</TableCell>
                        <TableCell className="text-right font-medium">€{coll.amount?.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(coll.due_date), "d MMM", { locale: nl })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={coll.days_overdue > 30 ? "destructive" : coll.days_overdue > 14 ? "default" : "secondary"}>
                            {coll.days_overdue}d
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(coll.status)}</TableCell>
                        <TableCell className="text-sm">{coll.owner}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCase(coll);
                            }}
                            aria-label={`Open incasso case ${coll.invoice}`}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {activeTab === "profiles" && (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border/30">
                {displayProfiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Shield className="h-8 w-8" />
                    <p className="font-medium">Geen kredietprofielen</p>
                  </div>
                ) : displayProfiles.map((profile: any) => {
                  const usagePercent = (profile.exposure / profile.credit_limit) * 100;
                  const isOverLimit = usagePercent > 100;
                  return (
                    <div
                      key={profile.id}
                      onClick={() => {
                        setSelectedProfile(profile);
                        setEditCreditLimit(profile.credit_limit || 0);
                        setEditPaymentTerms(profile.payment_terms || 30);
                        setEditRiskLevel(profile.risk_level || 'low');
                        setEditProforma(profile.proforma || false);
                        setEditStopShipping(profile.stop_shipping || false);
                      }}
                      className="p-4 cursor-pointer active:bg-muted/30 transition-colors touch-manipulation"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-semibold text-sm truncate">{profile.customer}</span>
                        </div>
                        {getRiskBadge(profile.risk_level)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Limiet: </span>
                          <span className="font-medium">€{profile.credit_limit?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Blootstelling: </span>
                          <span className={isOverLimit ? "font-medium text-red-500" : "font-medium"}>
                            {usagePercent.toFixed(0)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Achterstallig: </span>
                          <span className={profile.overdue > 0 ? "font-medium text-red-500" : "font-medium text-green-500"}>
                            €{profile.overdue?.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Termijn: </span>
                          <span className="font-medium">{profile.payment_terms}d</span>
                        </div>
                      </div>
                      {(profile.stop_shipping || profile.proforma) && (
                        <div className="flex gap-2 mt-2">
                          {profile.stop_shipping && <Badge variant="destructive" className="text-[10px]"><Ban className="h-3 w-3 mr-1" />Stop Ship</Badge>}
                          {profile.proforma && <Badge variant="outline" className="text-amber-500 text-[10px]">Proforma</Badge>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Klant</TableHead>
                      <TableHead className="text-right">Kredietlimiet</TableHead>
                      <TableHead className="text-right">Blootstelling</TableHead>
                      <TableHead className="text-right">Achterstallig</TableHead>
                      <TableHead>Risico</TableHead>
                      <TableHead>Termijn</TableHead>
                      <TableHead>Proforma</TableHead>
                      <TableHead>Stop Ship</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayProfiles.map((profile: any) => {
                      const usagePercent = (profile.exposure / profile.credit_limit) * 100;
                      const isOverLimit = usagePercent > 100;

                      return (
                        <TableRow key={profile.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                          setSelectedProfile(profile);
                          setEditCreditLimit(profile.credit_limit || 0);
                          setEditPaymentTerms(profile.payment_terms || 30);
                          setEditRiskLevel(profile.risk_level || 'low');
                          setEditProforma(profile.proforma || false);
                          setEditStopShipping(profile.stop_shipping || false);
                        }}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {profile.customer}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">€{profile.credit_limit?.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={isOverLimit ? "text-red-500 font-medium" : ""}>
                                €{profile.exposure?.toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({usagePercent.toFixed(0)}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {profile.overdue > 0 ? (
                              <span className="text-red-500 font-medium">€{profile.overdue?.toLocaleString()}</span>
                            ) : (
                              <span className="text-green-500">€0</span>
                            )}
                          </TableCell>
                          <TableCell>{getRiskBadge(profile.risk_level)}</TableCell>
                          <TableCell>{profile.payment_terms}d</TableCell>
                          <TableCell>
                            {profile.proforma ? (
                              <Badge variant="outline" className="text-amber-500">Ja</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {profile.stop_shipping ? (
                              <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Actief</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProfile(profile);
                                setEditCreditLimit(profile.credit_limit || 0);
                                setEditPaymentTerms(profile.payment_terms || 30);
                                setEditRiskLevel(profile.risk_level || 'low');
                                setEditProforma(profile.proforma || false);
                                setEditStopShipping(profile.stop_shipping || false);
                              }}
                              aria-label={`Open kredietprofiel ${profile.customer}`}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Collection Case Detail */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incasso Case: {selectedCase?.invoice}</DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Klant</p>
                  <p className="font-medium">{selectedCase.customer}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Bedrag</p>
                  <p className="font-medium text-lg">€{selectedCase.amount?.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => {
                  if (selectedCase.customer_phone) {
                    window.open(`tel:${selectedCase.customer_phone}`, '_blank');
                    toast({ title: "Klant bellen", description: `${selectedCase.customer_phone} wordt geopend.` });
                  } else {
                    toast({ title: "Geen telefoonnummer", description: `Er is geen telefoonnummer beschikbaar voor ${selectedCase.customer}.`, variant: "destructive" });
                  }
                }}><Phone className="h-4 w-4 mr-2" />Bellen</Button>
                <Button variant="outline" onClick={() => {
                  if (!selectedCase.customer_email) {
                    toast({ title: "Geen e-mailadres", description: `Er is geen e-mailadres beschikbaar voor ${selectedCase.customer}.`, variant: "destructive" });
                    return;
                  }
                  const subject = encodeURIComponent(`Herinnering: Openstaande factuur ${selectedCase.invoice}`);
                  const body = encodeURIComponent(`Geachte heer/mevrouw,\n\nUit onze administratie blijkt dat de volgende factuur nog openstaat:\n\nFactuurnummer: ${selectedCase.invoice}\nBedrag: €${selectedCase.amount?.toLocaleString()}\nVervaldatum: ${selectedCase.due_date}\nDagen te laat: ${selectedCase.days_overdue}\n\nGraag ontvangen wij uw betaling zo spoedig mogelijk.\n\nMet vriendelijke groet`);
                  window.open(`mailto:${selectedCase.customer_email}?subject=${subject}&body=${body}`, '_blank');
                  toast({ title: "E-mail geopend ✓", description: `Herinneringsmail voor ${selectedCase.invoice} is voorbereid.` });
                }}><Mail className="h-4 w-4 mr-2" />E-mail sturen</Button>
                <Button variant="outline" onClick={() => {
                  const promiseDate = new Date();
                  promiseDate.setDate(promiseDate.getDate() + 7);
                  updateCollectionCase.mutate({
                    id: selectedCase.id,
                    status: 'promised',
                    promised_date: promiseDate.toISOString(),
                    promised_amount: selectedCase.amount || 0,
                    notes: `Betalingsbelofte geregistreerd voor ${promiseDate.toLocaleDateString('nl-NL')}`,
                  });
                }}><Calendar className="h-4 w-4 mr-2" />Belofte registreren</Button>
              </div>

              <div className="space-y-2">
                <Label>Notitie toevoegen</Label>
                <Textarea 
                  placeholder="Notitie over contact met klant..." 
                  value={caseNote}
                  onChange={(e) => setCaseNote(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Select value={caseStatus} onValueChange={setCaseStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status wijzigen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contacted">Gecontacteerd</SelectItem>
                    <SelectItem value="promised">Belofte</SelectItem>
                    <SelectItem value="disputed">Betwist</SelectItem>
                    <SelectItem value="escalated">Escaleren</SelectItem>
                    <SelectItem value="paid">Betaald</SelectItem>
                  </SelectContent>
                </Select>
              <Button onClick={() => {
                  if (caseStatus || caseNote) {
                    updateCollectionCase.mutate({
                      id: selectedCase.id,
                      ...(caseStatus ? { status: caseStatus as any } : {}),
                      ...(caseNote ? { notes: caseNote } : {}),
                    }, {
                      onSuccess: () => {
                        setCaseStatus("");
                        setCaseNote("");
                        setSelectedCase(null);
                      }
                    });
                  } else {
                    toast({ title: "Geen wijzigingen", description: "Selecteer een status of voeg een notitie toe.", variant: "destructive" });
                  }
                }}>Opslaan</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Credit Profile Detail */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Kredietprofiel: {selectedProfile?.customer}
            </DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kredietlimiet</Label>
                  <Input type="number" value={editCreditLimit} onChange={(e) => setEditCreditLimit(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Betalingstermijn (dagen)</Label>
                  <Input type="number" value={editPaymentTerms} onChange={(e) => setEditPaymentTerms(parseInt(e.target.value) || 0)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Risiconiveau</Label>
                <Select value={editRiskLevel} onValueChange={setEditRiskLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Laag</SelectItem>
                    <SelectItem value="medium">Midden</SelectItem>
                    <SelectItem value="high">Hoog</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Proforma vereist</Label>
                    <p className="text-xs text-muted-foreground">Verzending pas na betaling</p>
                  </div>
                  <Switch checked={editProforma} onCheckedChange={setEditProforma} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Stop shipping bij achterstand</Label>
                    <p className="text-xs text-muted-foreground">Blokkeer verzendingen bij overdue</p>
                  </div>
                  <Switch checked={editStopShipping} onCheckedChange={setEditStopShipping} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedProfile(null)}>Annuleren</Button>
                <Button onClick={() => {
                  upsertCreditProfile.mutate({
                    customer_id: selectedProfile.customer_id,
                    credit_limit: editCreditLimit,
                    payment_terms_days: editPaymentTerms,
                    risk_level: editRiskLevel as any,
                    proforma_required: editProforma,
                    stop_shipping_on_overdue: editStopShipping,
                  }, {
                    onSuccess: () => setSelectedProfile(null),
                  });
                }}>Opslaan</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const Collections = () => (
  <DashboardLayout title="Credit Control & Collections" description="Kredietbeheer en incasso voor cashflow optimalisatie">
    <CollectionsContent />
  </DashboardLayout>
);

export default Collections;
