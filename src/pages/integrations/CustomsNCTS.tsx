import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  FileCheck, Plus, Search, Eye, Send, Download, Globe, Clock,
  CheckCircle, XCircle, AlertTriangle, Truck, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const customsOffices = [
  { code: 'NL000011', name: 'Rotterdam' },
  { code: 'NL000010', name: 'Amsterdam Schiphol' },
  { code: 'BE000001', name: 'Antwerpen' },
  { code: 'DE004301', name: 'Düsseldorf' },
  { code: 'DE000001', name: 'Hamburg' },
  { code: 'FR000001', name: 'Paris CDG' },
  { code: 'CH002801', name: 'Basel' },
  { code: 'GB001001', name: 'Felixstowe' },
];

export default function CustomsNCTS() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDeclaration, setNewDeclaration] = useState({
    type: 'T1',
    departure: '',
    destination: '',
    goodsDescription: '',
    packages: '',
    weight: '',
    commodityCode: '',
  });

  const { data: declarations = [], isLoading } = useQuery({
    queryKey: ['customs_declarations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('customs_declarations')
        .select('*')
        .eq('tenant_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const filteredDeclarations = declarations.filter(dec => 
    (dec.lrn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dec.mrn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dec.goods_description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'released':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Vrijgegeven</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-500 text-white"><Clock className="h-3 w-3 mr-1" />Ingediend</Badge>;
      case 'accepted':
        return <Badge className="bg-emerald-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Geaccepteerd</Badge>;
      case 'draft':
        return <Badge variant="outline"><FileCheck className="h-3 w-3 mr-1" />Concept</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Afgewezen</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Onbekend'}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'T1':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">T1 Transit</Badge>;
      case 'T2':
        return <Badge variant="outline" className="border-green-500 text-green-500">T2 EU</Badge>;
      case 'export':
        return <Badge variant="outline" className="border-amber-500 text-amber-500">Export</Badge>;
      case 'import':
        return <Badge variant="outline" className="border-purple-500 text-purple-500">Import</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const handleSubmitDeclaration = async (id: string) => {
    setSaving(true);
    const mrn = `24NL000000${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
    const { error } = await supabase
      .from('customs_declarations')
      .update({ status: 'submitted', mrn, submitted_at: new Date().toISOString() })
      .eq('id', id);
    setSaving(false);
    if (error) {
      toast.error("Kon aangifte niet indienen");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['customs_declarations'] });
    toast.success("Aangifte succesvol ingediend");
  };

  const handleCreateDeclaration = async () => {
    if (!company?.id) return;
    setSaving(true);
    const lrn = `NL${format(new Date(), 'yyMMdd')}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    const { error } = await supabase
      .from('customs_declarations')
      .insert({
        tenant_id: company.id,
        declaration_type: newDeclaration.type,
        lrn,
        status: 'draft',
        goods_description: newDeclaration.goodsDescription || null,
        customs_office_departure: newDeclaration.departure || null,
        customs_office_destination: newDeclaration.destination || null,
        total_packages: newDeclaration.packages ? parseInt(newDeclaration.packages) : null,
        gross_weight_kg: newDeclaration.weight ? parseFloat(newDeclaration.weight) : null,
        commodity_codes: newDeclaration.commodityCode ? [newDeclaration.commodityCode] : null,
      });
    setSaving(false);
    if (error) {
      toast.error("Kon aangifte niet aanmaken");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['customs_declarations'] });
    setIsCreateDialogOpen(false);
    setNewDeclaration({ type: 'T1', departure: '', destination: '', goodsDescription: '', packages: '', weight: '', commodityCode: '' });
    toast.success("Concept aangifte aangemaakt");
  };

  const stats = {
    total: declarations.length,
    draft: declarations.filter(d => d.status === 'draft').length,
    submitted: declarations.filter(d => d.status === 'submitted').length,
    released: declarations.filter(d => d.status === 'released').length,
  };

  return (
    <DashboardLayout title="Douane & NCTS" description="Beheer douaneaangiftes en transit documenten">
      <Tabs defaultValue="declarations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="declarations">Aangiftes</TabsTrigger>
          <TabsTrigger value="transit">Transit Tracking</TabsTrigger>
          <TabsTrigger value="commodities">Goederencodes</TabsTrigger>
        </TabsList>

        <TabsContent value="declarations" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><FileCheck className="h-5 w-5 text-primary" /></div>
                  <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Totaal aangiftes</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-500" /></div>
                  <div><p className="text-2xl font-bold">{stats.draft}</p><p className="text-sm text-muted-foreground">Concept</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10"><Send className="h-5 w-5 text-blue-500" /></div>
                  <div><p className="text-2xl font-bold">{stats.submitted}</p><p className="text-sm text-muted-foreground">Ingediend</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div>
                  <div><p className="text-2xl font-bold">{stats.released}</p><p className="text-sm text-muted-foreground">Vrijgegeven</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Zoek op LRN, MRN of goederen..." className="pl-9 w-80" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Nieuwe Aangifte</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Nieuwe Douaneaangifte</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type Aangifte</Label>
                      <Select value={newDeclaration.type} onValueChange={(v) => setNewDeclaration({...newDeclaration, type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="T1">T1 - Transit (niet-EU)</SelectItem>
                          <SelectItem value="T2">T2 - Transit (EU)</SelectItem>
                          <SelectItem value="export">Export</SelectItem>
                          <SelectItem value="import">Import</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Goederencode (HS)</Label>
                      <Input placeholder="bijv. 8703.23.19" value={newDeclaration.commodityCode} onChange={(e) => setNewDeclaration({...newDeclaration, commodityCode: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Douanekantoor Vertrek</Label>
                      <Select value={newDeclaration.departure} onValueChange={(v) => setNewDeclaration({...newDeclaration, departure: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecteer kantoor" /></SelectTrigger>
                        <SelectContent>
                          {customsOffices.map(office => (
                            <SelectItem key={office.code} value={`${office.code} ${office.name}`}>{office.code} - {office.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Douanekantoor Bestemming</Label>
                      <Select value={newDeclaration.destination} onValueChange={(v) => setNewDeclaration({...newDeclaration, destination: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecteer kantoor" /></SelectTrigger>
                        <SelectContent>
                          {customsOffices.map(office => (
                            <SelectItem key={office.code} value={`${office.code} ${office.name}`}>{office.code} - {office.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Aantal Colli</Label>
                      <Input type="number" placeholder="bijv. 20" value={newDeclaration.packages} onChange={(e) => setNewDeclaration({...newDeclaration, packages: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Brutogewicht (kg)</Label>
                      <Input type="number" placeholder="bijv. 5000" value={newDeclaration.weight} onChange={(e) => setNewDeclaration({...newDeclaration, weight: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Goederenomschrijving</Label>
                    <Textarea placeholder="Beschrijf de goederen..." value={newDeclaration.goodsDescription} onChange={(e) => setNewDeclaration({...newDeclaration, goodsDescription: e.target.value})} />
                  </div>
                  <Button className="w-full" onClick={handleCreateDeclaration} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Aangifte Aanmaken
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Declarations Table */}
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LRN</TableHead>
                      <TableHead>MRN</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Goederen</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeclarations.map(dec => (
                      <TableRow key={dec.id}>
                        <TableCell className="font-mono text-sm">{dec.lrn || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {dec.mrn || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>{getTypeBadge(dec.declaration_type)}</TableCell>
                        <TableCell className="max-w-48 truncate">{dec.goods_description || '-'}</TableCell>
                        <TableCell>
                          {dec.customs_office_departure && dec.customs_office_destination ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Globe className="h-3 w-3" />
                              {dec.customs_office_departure.split(' ')[1]} → {dec.customs_office_destination.split(' ')[1]}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(dec.status)}</TableCell>
                        <TableCell>
                          {dec.created_at ? format(new Date(dec.created_at), "d MMM HH:mm", { locale: nl }) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                            {dec.status === 'draft' && (
                              <Button variant="ghost" size="icon" onClick={() => handleSubmitDeclaration(dec.id)} disabled={saving}>
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredDeclarations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Geen aangiftes gevonden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transit Tracking</CardTitle>
              <CardDescription>Volg de status van actieve transitzendingen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {declarations.filter(d => d.status === 'submitted' || d.status === 'released').map(dec => (
                <Card key={dec.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">MRN: {dec.mrn || '-'}</p>
                        <p className="text-sm text-muted-foreground">{dec.goods_description}</p>
                      </div>
                      {getStatusBadge(dec.status)}
                    </div>
                    <Progress value={dec.status === 'released' ? 100 : 50} className="h-2" />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>{dec.customs_office_departure?.split(' ')[1] || 'Vertrek'}</span>
                      <span>{dec.customs_office_destination?.split(' ')[1] || 'Bestemming'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {declarations.filter(d => d.status === 'submitted' || d.status === 'released').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Geen actieve transitzendingen</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commodities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goederencodes</CardTitle>
              <CardDescription>HS/CN classificatie database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Goederencode database wordt geladen vanuit EU TARIC</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
