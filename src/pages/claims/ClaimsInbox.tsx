import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePODClaims } from "@/hooks/usePODClaims";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertTriangle, Search, FileCheck, Camera, MessageSquare,
  Clock, CheckCircle2, XCircle, Euro, User, Package,
  ChevronRight, Eye, Download, Send, Truck, Calendar
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

// Settlement section component
const SettlementSection = ({ 
  selectedClaim, 
  onSettle 
}: { 
  selectedClaim: any; 
  onSettle: (amount: number, liability: 'carrier' | 'customer' | 'charter') => void;
}) => {
  const [settlementAmount, setSettlementAmount] = useState<string>(selectedClaim?.claimed_amount?.toString() || '');
  const [settlementLiability, setSettlementLiability] = useState<'carrier' | 'customer' | 'charter'>('carrier');

  return (
    <div className="border-t pt-4">
      <Label>Afwikkeling voorstel</Label>
      <div className="flex gap-2 mt-2">
        <Input 
          type="number" 
          placeholder="Bedrag" 
          className="w-32" 
          value={settlementAmount}
          onChange={(e) => setSettlementAmount(e.target.value)}
        />
        <Select value={settlementLiability} onValueChange={(v) => setSettlementLiability(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Aansprakelijk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="carrier">Charter</SelectItem>
            <SelectItem value="customer">Klant</SelectItem>
            <SelectItem value="charter">Charter</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => {
          const amount = parseFloat(settlementAmount) || 0;
          onSettle(amount, settlementLiability);
        }}>Afwikkelen</Button>
      </div>
    </div>
  );
};


const ClaimsInbox = () => {
  const [activeTab, setActiveTab] = useState("claims");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  const { claims, pods, claimStats, isLoading, resolveClaim } = usePODClaims();

  const displayClaims = claims;
  const displayPODs = pods;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="destructive">Open</Badge>;
      case "in_review": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">In behandeling</Badge>;
      case "awaiting_info": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Wacht op info</Badge>;
      case "approved": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Goedgekeurd</Badge>;
      case "rejected": return <Badge variant="secondary">Afgewezen</Badge>;
      case "settled": return <Badge variant="outline">Afgewikkeld</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "damage": return <Badge variant="outline" className="text-red-500">Schade</Badge>;
      case "shortage": return <Badge variant="outline" className="text-orange-500">Tekort</Badge>;
      case "delay": return <Badge variant="outline" className="text-amber-500">Vertraging</Badge>;
      case "no_show": return <Badge variant="outline" className="text-purple-500">No-show</Badge>;
      default: return <Badge variant="outline">Anders</Badge>;
    }
  };

  const getLiabilityBadge = (liability: string) => {
    switch (liability) {
      case "carrier": return <Badge variant="outline" className="text-red-500">Charter</Badge>;
      case "customer": return <Badge variant="outline" className="text-blue-500">Klant</Badge>;
      case "charter": return <Badge variant="outline" className="text-purple-500">Charter</Badge>;
      default: return <Badge variant="secondary">Onbeslist</Badge>;
    }
  };

  const filteredClaims = displayClaims.filter((c: any) => {
    const matchesSearch = c.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.customer?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout title="Claims & POD" description="Proof-to-Cash: Claims beheer en aflevering bewijzen">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{claimStats?.open || 0}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{claimStats?.inReview || 0}</p>
              <p className="text-xs text-muted-foreground">In behandeling</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{claimStats?.awaitingInfo || 0}</p>
              <p className="text-xs text-muted-foreground">Wacht op info</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{claimStats?.resolved || 0}</p>
              <p className="text-xs text-muted-foreground">Afgehandeld</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">€{(claimStats?.totalClaimedAmount || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Geclaimd</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">€{(claimStats?.totalApprovedAmount || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Goedgekeurd</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="glass">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="claims">
                  Claims
                  <Badge variant="destructive" className="ml-2">{claimStats?.open || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pod">POD Overzicht</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Zoek order of klant..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              {activeTab === "claims" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statussen</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_review">In behandeling</SelectItem>
                    <SelectItem value="awaiting_info">Wacht op info</SelectItem>
                    <SelectItem value="approved">Goedgekeurd</SelectItem>
                    <SelectItem value="rejected">Afgewezen</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "claims" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aansprakelijkheid</TableHead>
                  <TableHead className="text-right">Geclaimd</TableHead>
                  <TableHead>Leeftijd</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((claim: any) => (
                  <TableRow key={claim.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedClaim(claim)}>
                    <TableCell className="font-mono font-medium">{claim.order_number}</TableCell>
                    <TableCell>{claim.customer}</TableCell>
                    <TableCell>{getTypeBadge(claim.claim_type)}</TableCell>
                    <TableCell>{getStatusBadge(claim.status)}</TableCell>
                    <TableCell>{getLiabilityBadge(claim.liability)}</TableCell>
                    <TableCell className="text-right font-medium">
                      €{claim.claimed_amount?.toLocaleString()}
                      {claim.approved_amount && (
                        <span className="text-green-500 ml-2">(€{claim.approved_amount})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={claim.age_days > 7 ? "text-amber-500" : ""}>
                        {claim.age_days}d
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClaim(claim);
                        }}
                        aria-label={`Open claim ${claim.order_number}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeTab === "pod" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead>Methode</TableHead>
                  <TableHead>Ontvanger</TableHead>
                  <TableHead>Tijdstip</TableHead>
                  <TableHead>Documenten</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayPODs.map((pod: any) => (
                  <TableRow key={pod.id}>
                    <TableCell className="font-mono font-medium">{pod.order_number}</TableCell>
                    <TableCell>{pod.customer}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {pod.method === 'signature' ? 'Handtekening' :
                         pod.method === 'photo' ? 'Foto' :
                         pod.method === 'scan' ? 'Scan' : 'Multi'}
                      </Badge>
                    </TableCell>
                    <TableCell>{pod.signed_name || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(pod.captured_at), "d MMM HH:mm", { locale: nl })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {pod.has_photos && <Camera className="h-4 w-4 text-blue-500" />}
                        {pod.has_documents && <FileCheck className="h-4 w-4 text-green-500" />}
                        {!pod.has_photos && !pod.has_documents && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={async (e) => {
                          e.stopPropagation();
                          toast.info(`POD wordt geladen voor ${pod.order_number}`);
                          try {
                            const { data, error } = await supabase.functions.invoke("generate-document-pdf", {
                              body: { orderId: pod.id, documentType: "pod" }
                            });
                            if (error) throw error;
                            if (data?.url) {
                              const response = await fetch(data.url);
                              const htmlContent = await response.text();
                              const viewWindow = window.open("", "_blank");
                              if (viewWindow) {
                                viewWindow.document.write(htmlContent);
                                viewWindow.document.close();
                              }
                            }
                          } catch (err) {
                            toast.error("POD kon niet worden geladen");
                          }
                        }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={async (e) => {
                          e.stopPropagation();
                          toast.info(`POD download gestart voor ${pod.order_number}`);
                          try {
                            const { data, error } = await supabase.functions.invoke("generate-document-pdf", {
                              body: { orderId: pod.id, documentType: "pod" }
                            });
                            if (error) throw error;
                            if (data?.url) {
                              const response = await fetch(data.url);
                              const htmlContent = await response.text();
                              const blob = new Blob([htmlContent], { type: 'text/html' });
                              const downloadUrl = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = downloadUrl;
                              a.download = `POD_${pod.order_number}.html`;
                              a.click();
                              URL.revokeObjectURL(downloadUrl);
                              toast.success("POD gedownload");
                            }
                          } catch (err) {
                            toast.error("Download mislukt");
                          }
                        }}><Download className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Claim Detail Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Claim {selectedClaim?.order_number}
            </DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Klant</p>
                  <p className="font-medium">{selectedClaim.customer}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium">{getTypeBadge(selectedClaim.claim_type)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Geclaimd bedrag</p>
                  <p className="font-medium text-lg">€{selectedClaim.claimed_amount?.toLocaleString()}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedClaim.notes && (
                <div>
                  <Label className="text-muted-foreground">Omschrijving</Label>
                  <p className="mt-1">{selectedClaim.notes}</p>
                </div>
              )}

              {/* Evidence placeholder */}
              <div>
                <Label className="text-muted-foreground">Bewijsmateriaal</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <FileCheck className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={async () => {
                  if (selectedClaim?.id && !selectedClaim.id.startsWith('demo')) {
                    try {
                      const { error } = await supabase
                        .from('claim_cases')
                        .update({ status: 'awaiting_info' })
                        .eq('id', selectedClaim.id);
                      if (error) throw error;
                    } catch (e) {
                      console.error('Failed to update status:', e);
                    }
                  }
                  toast.success('Informatie aangevraagd ✓', { 
                    description: `E-mail verstuurd naar klant voor meer details over claim ${selectedClaim?.order_number}.`
                  });
                }}><MessageSquare className="h-4 w-4 mr-2" />Vraag info op</Button>
                <Button variant="outline" onClick={async () => {
                  if (selectedClaim?.id && !selectedClaim.id.startsWith('demo')) {
                    try {
                      const { error } = await supabase
                        .from('claim_cases')
                        .update({ status: 'in_review' })
                        .eq('id', selectedClaim.id);
                      if (error) throw error;
                    } catch (e) {
                      console.error('Failed to update status:', e);
                    }
                  }
                  const subject = encodeURIComponent(`Claim doorgestuurd: ${selectedClaim?.order_number}`);
                  const body = encodeURIComponent(`Geachte charter,\n\nHierbij sturen wij u de claim door voor order ${selectedClaim?.order_number}.\n\nType: ${selectedClaim?.claim_type}\nBedrag: €${selectedClaim?.claimed_amount}\n\nGraag uw reactie binnen 5 werkdagen.\n\nMet vriendelijke groet`);
                  window.open(`mailto:charter@example.com?subject=${subject}&body=${body}`, '_blank');
                  toast.success('Claim doorgestuurd ✓', { description: 'E-mail naar charter is geopend in uw e-mailprogramma.' });
                }}><Send className="h-4 w-4 mr-2" />Stuur naar charter</Button>
                <Button variant="outline" className="text-green-500" onClick={async () => {
                  if (selectedClaim?.id && !selectedClaim.id.startsWith('demo')) {
                    await resolveClaim.mutateAsync({ id: selectedClaim.id, status: 'approved', approved_amount: selectedClaim.claimed_amount });
                  }
                  toast.success('Claim goedgekeurd', { description: `Claim ${selectedClaim?.order_number} is goedgekeurd.` });
                  setSelectedClaim(null);
                }}><CheckCircle2 className="h-4 w-4 mr-2" />Goedkeuren</Button>
                <Button variant="outline" className="text-red-500" onClick={async () => {
                  if (selectedClaim?.id && !selectedClaim.id.startsWith('demo')) {
                    await resolveClaim.mutateAsync({ id: selectedClaim.id, status: 'rejected' });
                  }
                  toast.error('Claim afgewezen', { description: `Claim ${selectedClaim?.order_number} is afgewezen.` });
                  setSelectedClaim(null);
                }}><XCircle className="h-4 w-4 mr-2" />Afwijzen</Button>
              </div>

              {/* Settlement */}
              <SettlementSection 
                selectedClaim={selectedClaim} 
                onSettle={async (amount, liability) => {
                  if (selectedClaim?.id && !selectedClaim.id.startsWith('demo')) {
                    await resolveClaim.mutateAsync({ 
                      id: selectedClaim.id, 
                      status: 'settled', 
                      approved_amount: amount,
                      liability 
                    });
                  }
                  toast.success('Afwikkeling verstuurd', { description: 'Het voorstel is opgeslagen.' });
                  setSelectedClaim(null);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ClaimsInbox;
