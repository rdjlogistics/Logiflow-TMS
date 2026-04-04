import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  BadgeCheck, 
  Plus, 
  Upload, 
  FileText, 
  Calendar, 
  User, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  Shield,
  Award,
  Sparkles,
  Filter,
  Search,
  MoreVertical,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

const docTypes = [
  { value: 'drivers_license', label: 'Rijbewijs C/CE', icon: '🚛', color: 'from-blue-500/20 to-blue-600/10' },
  { value: 'adr_certificate', label: 'ADR Certificaat', icon: '⚠️', color: 'from-amber-500/20 to-amber-600/10' },
  { value: 'health_certificate', label: 'Medische keuring', icon: '🏥', color: 'from-emerald-500/20 to-emerald-600/10' },
  { value: 'contract', label: 'Arbeidscontract', icon: '📝', color: 'from-purple-500/20 to-purple-600/10' },
  { value: 'tailgate_certificate', label: 'Laadklep certificaat', icon: '📦', color: 'from-orange-500/20 to-orange-600/10' },
  { value: 'other', label: 'Overig', icon: '📄', color: 'from-slate-500/20 to-slate-600/10' },
];

const statusConfig = {
  valid: { 
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    glow: 'shadow-emerald-500/20',
    icon: CheckCircle2,
    label: 'Geldig'
  },
  expiring_soon: { 
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    glow: 'shadow-amber-500/20',
    icon: Clock,
    label: 'Verloopt binnenkort'
  },
  expired: { 
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
    glow: 'shadow-red-500/20',
    icon: AlertTriangle,
    label: 'Verlopen'
  },
  pending: { 
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    glow: 'shadow-blue-500/20',
    icon: Clock,
    label: 'In afwachting'
  },
};

const containerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } }
};

const DriverDocs = () => {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [form, setForm] = useState({
    driver_id: '',
    doc_type: '',
    doc_name: '',
    doc_number: '',
    issue_date: '',
    expiry_date: '',
    notes: '',
  });

  // Fetch drivers
  const { data: drivers } = useQuery({
    queryKey: ['drivers-for-docs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch compliance documents for drivers
  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ['driver-compliance-docs', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('compliance_documents')
        .select('*, profiles:entity_id(full_name)')
        .eq('company_id', company.id)
        .eq('entity_type', 'driver')
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Add document mutation
  const addDocument = useMutation({
    mutationFn: async (data: typeof form) => {
      if (!company?.id) throw new Error('Geen bedrijf geselecteerd');
      
      const { error } = await supabase
        .from('compliance_documents')
        .insert([{
          company_id: company.id,
          entity_type: 'driver' as const,
          entity_id: data.driver_id,
          doc_type: data.doc_type as 'drivers_license' | 'adr_certificate' | 'health_certificate' | 'contract' | 'tailgate_certificate' | 'other',
          doc_name: data.doc_name,
          doc_number: data.doc_number || null,
          issue_date: data.issue_date || null,
          expiry_date: data.expiry_date || null,
          notes: data.notes || null,
          status: 'valid' as const,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-compliance-docs'] });
      setDialogOpen(false);
      setForm({ driver_id: '', doc_type: '', doc_name: '', doc_number: '', issue_date: '', expiry_date: '', notes: '' });
      toast({ title: "Document toegevoegd", description: "Het document is succesvol opgeslagen." });
    },
    onError: (error) => {
      toast({ title: "Fout bij opslaan", description: error.message, variant: "destructive" });
    },
  });

  // Delete document mutation
  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('compliance_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-compliance-docs'] });
      toast({ title: "Document verwijderd" });
    },
  });

  const handleSubmit = () => {
    if (!form.driver_id || !form.doc_type || !form.doc_name) {
      toast({ title: "Vul verplichte velden in", description: "Chauffeur, type en naam zijn verplicht.", variant: "destructive" });
      return;
    }
    addDocument.mutate(form);
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: 'valid' as const, daysLeft: null };
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { status: 'expired' as const, daysLeft: days };
    if (days <= 30) return { status: 'expiring_soon' as const, daysLeft: days };
    return { status: 'valid' as const, daysLeft: days };
  };

  // Filter documents
  const filteredDocs = documents?.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.doc_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.profiles as any)?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || doc.doc_type === filterType;
    return matchesSearch && matchesType;
  }) || [];

  // Stats
  const stats = {
    total: documents?.length || 0,
    valid: documents?.filter(d => getExpiryStatus(d.expiry_date).status === 'valid').length || 0,
    expiring: documents?.filter(d => getExpiryStatus(d.expiry_date).status === 'expiring_soon').length || 0,
    expired: documents?.filter(d => getExpiryStatus(d.expiry_date).status === 'expired').length || 0,
  };

  return (
    <DashboardLayout title="Chauffeur Documenten" description="Compliance beheer">
      <div 
        className="space-y-6"
      >
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500/10 via-background to-emerald-500/5 border border-teal-500/20 p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                  Chauffeur Compliance
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Rijbewijzen, certificaten & contracten
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
                className="h-10 border-border/50 hover:bg-muted/50"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-10 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-lg shadow-teal-500/25 active:scale-[0.98] transition-all">
                    <Plus className="h-4 w-4 mr-2" />
                    Document Toevoegen
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-border/50 bg-background/95 backdrop-blur-xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-teal-400" />
                      </div>
                      <div>
                        <span className="block">Nieuw Document</span>
                        <span className="text-xs font-normal text-muted-foreground">Compliance registratie</span>
                      </div>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground tracking-wider">Chauffeur *</Label>
                      <Select value={form.driver_id} onValueChange={(val) => setForm(prev => ({ ...prev, driver_id: val }))}>
                        <SelectTrigger className="h-11 bg-muted/30 border-border/50">
                          <SelectValue placeholder="Selecteer chauffeur..." />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers?.map(driver => (
                            <SelectItem key={driver.id} value={driver.id}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {driver.full_name || 'Naamloos'}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground tracking-wider">Document type *</Label>
                      <Select value={form.doc_type} onValueChange={(val) => {
                        const docType = docTypes.find(d => d.value === val);
                        setForm(prev => ({ ...prev, doc_type: val, doc_name: docType?.label || prev.doc_name }));
                      }}>
                        <SelectTrigger className="h-11 bg-muted/30 border-border/50">
                          <SelectValue placeholder="Selecteer type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {docTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <span>{type.icon}</span>
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground tracking-wider">Naam *</Label>
                      <Input
                        placeholder="bijv. Rijbewijs CE Jan Janssen"
                        value={form.doc_name}
                        onChange={(e) => setForm(prev => ({ ...prev, doc_name: e.target.value }))}
                        className="h-11 bg-muted/30 border-border/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Nummer</Label>
                        <Input
                          placeholder="optioneel"
                          value={form.doc_number}
                          onChange={(e) => setForm(prev => ({ ...prev, doc_number: e.target.value }))}
                          className="h-11 bg-muted/30 border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Vervaldatum</Label>
                        <Input
                          type="date"
                          value={form.expiry_date}
                          onChange={(e) => setForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                          className="h-11 bg-muted/30 border-border/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground tracking-wider">Notities</Label>
                      <Textarea
                        placeholder="Optionele opmerkingen..."
                        value={form.notes}
                        onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                        className="bg-muted/30 border-border/50"
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border/50">
                      Annuleren
                    </Button>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={addDocument.isPending}
                      className="min-w-[120px] bg-gradient-to-r from-teal-500 to-emerald-600"
                    >
                      {addDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <><CheckCircle2 className="h-4 w-4 mr-2" />Opslaan</>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Totaal', value: stats.total, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Geldig', value: stats.valid, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Verloopt', value: stats.expiring, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Verlopen', value: stats.expired, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
          ].map((stat) => (
            <Card key={stat.label} variant="glass" className="relative overflow-hidden group hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam of chauffeur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-muted/30 border-border/50"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[200px] h-11 bg-muted/30 border-border/50">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle types</SelectItem>
              {docTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Documents Grid */}
        {isLoading ? (
          <Card variant="glass">
            <CardContent className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-400" />
              <p className="text-sm text-muted-foreground mt-3">Documenten laden...</p>
            </CardContent>
          </Card>
        ) : filteredDocs.length === 0 ? (
          <div>
            <Card variant="glass" className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-10 w-10 text-teal-400/50" />
                </div>
                <p className="font-semibold text-lg mb-1">Geen documenten</p>
                <p className="text-sm text-muted-foreground mb-6">
                  {searchQuery ? 'Geen resultaten voor je zoekopdracht' : 'Voeg het eerste chauffeur document toe'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-teal-500 to-emerald-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Document Toevoegen
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map((doc) => {
              const { status, daysLeft } = getExpiryStatus(doc.expiry_date);
              const config = statusConfig[status];
              const driverName = (doc.profiles as any)?.full_name || 'Onbekend';
              const docType = docTypes.find(t => t.value === doc.doc_type);
              
              return (
                <div
                  key={doc.id}
                  className={cn(
                    "group relative rounded-xl border bg-gradient-to-br p-4 transition-all hover:shadow-lg cursor-pointer",
                    "active:scale-[0.99] touch-manipulation",
                    docType?.color || 'from-slate-500/10 to-slate-600/5',
                    "border-border/50 hover:border-primary/30"
                  )}
                >
                  {/* Status indicator */}
                  <div className={cn(
                    "absolute top-3 right-3 w-2.5 h-2.5 rounded-full",
                    status === 'valid' && "bg-emerald-500 shadow-lg shadow-emerald-500/50",
                    status === 'expiring_soon' && "bg-amber-500 shadow-lg shadow-amber-500/50 animate-pulse",
                    status === 'expired' && "bg-red-500 shadow-lg shadow-red-500/50 animate-pulse"
                  )} />
                  
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-background/50 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0 border border-border/30">
                      {docType?.icon || '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{doc.doc_name}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate">{driverName}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {doc.expiry_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(doc.expiry_date), 'd MMM yyyy', { locale: nl })}
                        </div>
                      )}
                    </div>
                    <Badge className={cn("text-[10px] font-medium", config.color)}>
                      {daysLeft !== null && daysLeft < 0 
                        ? `${Math.abs(daysLeft)}d verlopen` 
                        : daysLeft !== null && daysLeft <= 30 
                        ? `${daysLeft}d` 
                        : config.label
                      }
                    </Badge>
                  </div>
                  
                  {/* Delete button on hover */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-3 right-3 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); deleteDocument.mutate(doc.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DriverDocs;
