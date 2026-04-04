import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wrench,
  Plus,
  Search,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Euro,
  Settings,
  Loader2,
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
    vehicleId: '',
    maintenanceType: '',
    title: '',
    vendorName: '',
    estimatedCost: '',
    notes: '',
  });

  // Fetch real vehicles for dropdown
  const { vehicles, vehiclesLoading } = useFleetManagement();

  // Fetch real maintenance_orders from Supabase
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

  // Insert new maintenance_order
  const addMutation = useMutation({
    mutationFn: async (payload: {
      vehicle_id: string;
      maintenance_type: string;
      title: string;
      vendor_name: string | null;
      cost: number | null;
      notes: string | null;
      scheduled_date: string;
      status: string;
    }) => {
      const { error } = await (supabase as any).from('maintenance_orders').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
      setIsAddDialogOpen(false);
      setFormData({ vehicleId: '', maintenanceType: '', title: '', vendorName: '', estimatedCost: '', notes: '' });
      setSelectedDate(undefined);
      toast({ title: 'Onderhoud gepland', description: 'Het onderhoud is succesvol ingepland.' });
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
    switch (status) {
      case 'scheduled':
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Gepland
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Settings className="h-3 w-3 mr-1 animate-spin" />
            In behandeling
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Afgerond
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Achterstallig
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Geannuleerd
          </Badge>
        );
      default:
        return <Badge variant="outline">{status || '–'}</Badge>;
    }
  };

  const getTypeBadge = (type: string | null) => {
    const typeLabels: Record<string, { label: string; color: string }> = {
      apk: { label: 'APK', color: 'bg-purple-500/10 text-purple-500' },
      preventive: { label: 'Preventief', color: 'bg-blue-500/10 text-blue-500' },
      corrective: { label: 'Correctief', color: 'bg-orange-500/10 text-orange-500' },
      inspection: { label: 'Inspectie', color: 'bg-cyan-500/10 text-cyan-500' },
      oil_change: { label: 'Olie', color: 'bg-amber-500/10 text-amber-500' },
      tire: { label: 'Banden', color: 'bg-slate-500/10 text-slate-500' },
      brake: { label: 'Remmen', color: 'bg-red-500/10 text-red-500' },
      other: { label: 'Overig', color: 'bg-gray-500/10 text-gray-500' },
    };
    const config = typeLabels[type || 'other'] || typeLabels.other;
    return <Badge className={cn(config.color, 'border-current/20')}>{config.label}</Badge>;
  };

  // Computed stats from real data
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

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Gepland" value={statsScheduled} color="blue" />
        <StatCard label="In behandeling" value={statsInProgress} color="yellow" />
        <StatCard label="Afgerond" value={statsCompleted} color="green" />
        <StatCard label="Achterstallig" value={statsOverdue} color="red" />
        <StatCard
          label="Totale kosten"
          value={`€${(statsCost / 1000).toFixed(1)}k`}
          color="purple"
        />
      </div>

      {/* Records Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Onderhoudsregistraties
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek onderhoud..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuw onderhoud
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Onderhoud plannen</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Voertuig *</Label>
                      <Select
                        value={formData.vehicleId}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, vehicleId: v }))}
                        disabled={vehiclesLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={vehiclesLoading ? 'Laden...' : 'Selecteer voertuig'} />
                        </SelectTrigger>
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
                        <Label>Type onderhoud</Label>
                        <Select
                          value={formData.maintenanceType}
                          onValueChange={(v) => setFormData(prev => ({ ...prev, maintenanceType: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apk">APK Keuring</SelectItem>
                            <SelectItem value="preventive">Preventief onderhoud</SelectItem>
                            <SelectItem value="corrective">Correctief onderhoud</SelectItem>
                            <SelectItem value="oil_change">Olie verversen</SelectItem>
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
                            <Button variant="outline" className="justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, 'PPP', { locale: nl }) : 'Selecteer datum'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Titel *</Label>
                      <Input
                        placeholder="Beschrijf het onderhoud..."
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Leverancier</Label>
                        <Input
                          placeholder="Naam garage/dealer"
                          value={formData.vendorName}
                          onChange={(e) => setFormData(prev => ({ ...prev, vendorName: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Geschatte kosten (€)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.estimatedCost}
                          onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Notities</Label>
                      <Textarea
                        placeholder="Extra opmerkingen..."
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                    <Button
                      className="w-full mt-2"
                      onClick={handleSubmit}
                      disabled={addMutation.isPending}
                    >
                      {addMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Opslaan...
                        </>
                      ) : (
                        'Onderhoud plannen'
                      )}
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
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Geen onderhoud gevonden' : 'Nog geen onderhoudsregistraties'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
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
                  {filteredRecords.map((record, index) => (
                    <tr
                      key={record.id}
                      className="group hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <TableCell>
                        {record.vehicle ? (
                          <div>
                            <span className="font-mono font-semibold">{record.vehicle.license_plate}</span>
                            <div className="text-xs text-muted-foreground">
                              {[record.vehicle.brand, record.vehicle.model].filter(Boolean).join(' ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(record.maintenance_type)}</TableCell>
                      <TableCell className="font-medium">{record.title || '–'}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        {record.scheduled_date
                          ? format(new Date(record.scheduled_date), 'd MMM yyyy', { locale: nl })
                          : '–'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {record.cost != null ? (
                          <span className="flex items-center justify-end gap-1">
                            <Euro className="h-3 w-3" />
                            {record.cost.toLocaleString('nl-NL')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.vendor_name || '–'}
                      </TableCell>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
}) => {
  const colorMap = {
    blue: 'border-blue-500/20 bg-blue-500/5',
    green: 'border-green-500/20 bg-green-500/5',
    yellow: 'border-yellow-500/20 bg-yellow-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    purple: 'border-purple-500/20 bg-purple-500/5',
    orange: 'border-orange-500/20 bg-orange-500/5',
  };

  return (
    <Card className={cn('border', colorMap[color])}>
      <CardContent className="p-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="text-xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
};

export default MaintenanceManagement;
