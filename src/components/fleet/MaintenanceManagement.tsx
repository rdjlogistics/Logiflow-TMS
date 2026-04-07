import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Wrench, Plus, Search, Calendar as CalendarIcon,
  AlertTriangle, CheckCircle, Clock, XCircle, Euro, Settings, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFleetManagement } from '@/hooks/useFleetManagement';

interface MaintenanceOrder {
  id: string;
  vehicle_id: string | null;
  status: string | null;
  title: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  cost: number | null;
  vendor_name: string | null;
  maintenance_type: string | null;
  notes: string | null;
  vehicle?: { license_plate: string; brand: string | null; model: string | null } | null;
}

const MaintenanceManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    vehicleId: '', maintenanceType: '', title: '', vendorName: '', estimatedCost: '', notes: '',
  });

  const { vehicles, vehiclesLoading } = useFleetManagement();

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['maintenance-orders'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('maintenance_orders')
        .select('*, vehicle:vehicles(license_plate, brand, model)')
        .order('scheduled_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as MaintenanceOrder[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (payload: {
      vehicle_id: string; maintenance_type: string; title: string;
      vendor_name: string | null; cost: number | null; notes: string | null;
      scheduled_date: string; status: string;
    }) => {
      const { error } = await (supabase as any).from('maintenance_orders').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
      setIsAddDialogOpen(false);
      setFormData({ vehicleId: '', maintenanceType: '', title: '', vendorName: '', estimatedCost: '', notes: '' });
      setSelectedDate(undefined);
      toast({ title: 'Onderhoud gepland' });
    },
    onError: (err: any) => {
      toast({ title: 'Fout bij opslaan', description: err.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!formData.vehicleId || !formData.title) {
      toast({ title: 'Vul verplichte velden in', variant: 'destructive' });
      return;
    }
    addMutation.mutate({
      vehicle_id: formData.vehicleId,
      maintenance_type: formData.maintenanceType || 'other',
      title: formData.title,
      vendor_name: formData.vendorName || null,
      cost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null,
      notes: formData.notes || null,
      scheduled_date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: 'scheduled',
    });
  };

  const getStatusBadge = (status: string | null) => {
    const map: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
      scheduled: { icon: Clock, label: 'Gepland', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      in_progress: { icon: Settings, label: 'In behandeling', cls: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
      completed: { icon: CheckCircle, label: 'Afgerond', cls: 'bg-green-500/10 text-green-500 border-green-500/20' },
      overdue: { icon: AlertTriangle, label: 'Achterstallig', cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
      cancelled: { icon: XCircle, label: 'Geannuleerd', cls: 'bg-muted text-muted-foreground border-border/20' },
    };
    const cfg = map[status || ''] || { icon: Clock, label: status || '–', cls: 'bg-muted text-muted-foreground' };
    const Icon = cfg.icon;
    return <Badge className={cfg.cls}><Icon className={cn('h-3 w-3 mr-1', status === 'in_progress' && 'animate-spin')} />{cfg.label}</Badge>;
  };

  const getTypeBadge = (type: string | null) => {
    const labels: Record<string, { label: string; cls: string }> = {
      apk: { label: 'APK', cls: 'bg-purple-500/10 text-purple-500' },
      preventive: { label: 'Preventief', cls: 'bg-blue-500/10 text-blue-500' },
      corrective: { label: 'Correctief', cls: 'bg-orange-500/10 text-orange-500' },
      inspection: { label: 'Inspectie', cls: 'bg-cyan-500/10 text-cyan-500' },
      oil_change: { label: 'Olie', cls: 'bg-amber-500/10 text-amber-500' },
      tire: { label: 'Banden', cls: 'bg-slate-500/10 text-slate-500' },
      brake: { label: 'Remmen', cls: 'bg-red-500/10 text-red-500' },
      other: { label: 'Overig', cls: 'bg-muted text-muted-foreground' },
    };
    const cfg = labels[type || 'other'] || labels.other;
    return <Badge className={cfg.cls}>{cfg.label}</Badge>;
  };

  const statsScheduled = records.filter(r => r.status === 'scheduled').length;
  const statsInProgress = records.filter(r => r.status === 'in_progress').length;
  const statsCompleted = records.filter(r => r.status === 'completed').length;
  const statsOverdue = records.filter(r => r.status === 'overdue').length;
  const statsCost = records.reduce((s, r) => s + (r.cost || 0), 0);

  const filteredRecords = records.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      (r.vehicle?.license_plate || '').toLowerCase().includes(q) ||
      (r.title || '').toLowerCase().includes(q) ||
      (r.vendor_name || '').toLowerCase().includes(q)
    );
  });

  const statItems = [
    { label: 'Gepland', value: statsScheduled, accent: 'text-blue-500' },
    { label: 'In behandeling', value: statsInProgress, accent: 'text-yellow-500' },
    { label: 'Afgerond', value: statsCompleted, accent: 'text-emerald-500' },
    { label: 'Achterstallig', value: statsOverdue, accent: 'text-red-500' },
    { label: 'Totale kosten', value: `€${(statsCost / 1000).toFixed(1)}k`, accent: 'text-purple-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Compact Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {statItems.map((s) => (
          <div key={s.label} className="rounded-xl border border-border/20 bg-card/60 backdrop-blur-sm px-3 py-2.5">
            <p className={cn('text-lg font-semibold tabular-nums leading-none', s.accent)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Records */}
      <Card className="border-border/20 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Onderhoudsregistraties
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Zoek..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Nieuw</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Onderhoud plannen</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Voertuig *</Label>
                      <Select value={formData.vehicleId} onValueChange={(v) => setFormData(prev => ({ ...prev, vehicleId: v }))} disabled={vehiclesLoading}>
                        <SelectTrigger><SelectValue placeholder={vehiclesLoading ? 'Laden...' : 'Selecteer voertuig'} /></SelectTrigger>
                        <SelectContent>
                          {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.license_plate}{v.brand ? ` (${v.brand}${v.model ? ' ' + v.model : ''})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Type</Label>
                        <Select value={formData.maintenanceType} onValueChange={(v) => setFormData(prev => ({ ...prev, maintenanceType: v }))}>
                          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apk">APK</SelectItem>
                            <SelectItem value="preventive">Preventief</SelectItem>
                            <SelectItem value="corrective">Correctief</SelectItem>
                            <SelectItem value="oil_change">Olie</SelectItem>
                            <SelectItem value="tire">Banden</SelectItem>
                            <SelectItem value="brake">Remmen</SelectItem>
                            <SelectItem value="inspection">Inspectie</SelectItem>
                            <SelectItem value="other">Overig</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Datum</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal h-10">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, 'PPP', { locale: nl }) : 'Datum'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Titel *</Label>
                      <Input placeholder="Beschrijf het onderhoud..." value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Leverancier</Label>
                        <Input placeholder="Garage/dealer" value={formData.vendorName} onChange={(e) => setFormData(prev => ({ ...prev, vendorName: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Kosten (€)</Label>
                        <Input type="number" placeholder="0" value={formData.estimatedCost} onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Notities</Label>
                      <Textarea placeholder="Extra opmerkingen..." rows={2} value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
                    </div>
                    <Button className="w-full" onClick={handleSubmit} disabled={addMutation.isPending}>
                      {addMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Opslaan...</> : 'Onderhoud plannen'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{searchQuery ? 'Geen resultaten' : 'Nog geen onderhoud'}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-xl border border-border/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead>Voertuig</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Omschrijving</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead className="text-right">Kosten</TableHead>
                      <TableHead>Leverancier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="group hover:bg-muted/20 transition-colors">
                        <TableCell>
                          {record.vehicle ? (
                            <div>
                              <span className="font-mono font-semibold text-sm">{record.vehicle.license_plate}</span>
                              <div className="text-[11px] text-muted-foreground">{[record.vehicle.brand, record.vehicle.model].filter(Boolean).join(' ')}</div>
                            </div>
                          ) : <span className="text-muted-foreground">–</span>}
                        </TableCell>
                        <TableCell>{getTypeBadge(record.maintenance_type)}</TableCell>
                        <TableCell className="font-medium text-sm">{record.title || '–'}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-sm">
                          {record.scheduled_date ? format(new Date(record.scheduled_date), 'd MMM yyyy', { locale: nl }) : '–'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {record.cost != null ? <span className="flex items-center justify-end gap-1"><Euro className="h-3 w-3" />{record.cost.toLocaleString('nl-NL')}</span> : <span className="text-muted-foreground">–</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{record.vendor_name || '–'}</TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="rounded-xl border border-border/20 bg-card/40 p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{record.title || 'Onderhoud'}</p>
                        {record.vehicle && (
                          <p className="text-xs text-muted-foreground font-mono">{record.vehicle.license_plate} · {[record.vehicle.brand, record.vehicle.model].filter(Boolean).join(' ')}</p>
                        )}
                      </div>
                      {getStatusBadge(record.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {getTypeBadge(record.maintenance_type)}
                      {record.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(record.scheduled_date), 'd MMM', { locale: nl })}
                        </span>
                      )}
                      {record.cost != null && (
                        <span className="ml-auto font-mono font-semibold text-foreground">€{record.cost.toLocaleString('nl-NL')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceManagement;
