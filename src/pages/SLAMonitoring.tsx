import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Shield, 
  AlertTriangle,
  XCircle,
  TrendingUp,
  Plus,
  Download,
  FileText,
  Loader2,
  Trash2,
  Power
} from "lucide-react";
import { useSLADefinitions, useSLAPerformance, CreateSLADefinitionData } from "@/hooks/useSLADefinitions";

const SLAMonitoring = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Form state for new SLA
  const [newSLA, setNewSLA] = useState<Partial<CreateSLADefinitionData>>({
    name: '',
    metric_type: '',
    target_value: 95,
    target_unit: 'percentage',
    measurement_period: 'monthly'
  });

  const { 
    slaDefinitions, 
    isLoading, 
    createSLA, 
    deleteSLA, 
    toggleActive,
    isCreating 
  } = useSLADefinitions();
  
  const { data: slaPerformance = [], isLoading: isLoadingPerformance } = useSLAPerformance();

  const handleCreateSLA = () => {
    if (!newSLA.name || !newSLA.metric_type || !newSLA.target_value) return;
    
    createSLA(newSLA as CreateSLADefinitionData);
    setIsAddDialogOpen(false);
    setNewSLA({
      name: '',
      metric_type: '',
      target_value: 95,
      target_unit: 'percentage',
      measurement_period: 'monthly'
    });
  };

  const handleExport = () => {
    const csvContent = `SLA Monitoring Export
    
SLA Naam,Klant,Metriek,Target,Status,Actief
${slaDefinitions.map(sla => 
  `${sla.name},${sla.customer?.company_name || 'Algemeen'},${sla.metric_type},${sla.target_value}${sla.target_unit === 'percentage' ? '%' : ` ${sla.target_unit}`},${sla.is_active ? 'Actief' : 'Inactief'}`
).join('\n')}
`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sla-monitoring-export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return <Badge className="bg-emerald-500">Op schema</Badge>;
      case "warning":
      case "at_risk":
        return <Badge className="bg-amber-500">Waarschuwing</Badge>;
      case "critical":
        return <Badge className="bg-red-500">Kritiek</Badge>;
      case "no_data":
        return <Badge variant="secondary">Geen data</Badge>;
      default:
        return <Badge variant="secondary">Onbekend</Badge>;
    }
  };

  // Filter SLAs based on performance status
  const filteredPerformance = slaPerformance.filter(perf => {
    if (filterStatus === "all") return true;
    if (filterStatus === "green") return perf.status === "ok";
    if (filterStatus === "amber") return perf.status === "warning" || perf.status === "at_risk";
    if (filterStatus === "red") return perf.status === "critical";
    return true;
  });

  // Calculate overall stats
  const validPerformance = slaPerformance.filter(p => p.currentValue !== null);
  const totalCompliance = validPerformance.length > 0 
    ? (validPerformance.reduce((sum, p) => sum + (p.currentValue || 0), 0) / validPerformance.length).toFixed(1)
    : "0";
  const totalBreaches = slaPerformance.reduce((sum, p) => sum + p.breachCount, 0);
  const criticalCount = slaPerformance.filter(p => p.status === "critical").length;

  if (isLoading) {
    return (
      <DashboardLayout title="SLA Monitoring">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="SLA Monitoring" 
      description="Monitor en beheer service level agreements"
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gemiddelde Compliance</CardTitle>
              <Shield className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCompliance}%</div>
              <p className="text-xs text-emerald-500 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Gebaseerd op echte data
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLA's Onder Target</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBreaches}</div>
              <p className="text-xs text-muted-foreground">
                Van {slaDefinitions.length} definities
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kritieke SLA's</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{criticalCount}</div>
              <p className="text-xs text-muted-foreground">
                Directe actie vereist
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actieve SLA's</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {slaDefinitions.filter(s => s.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Gedefinieerde agreements
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <TabsList>
              <TabsTrigger value="overview">Overzicht</TabsTrigger>
              <TabsTrigger value="definitions">Definities</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="green">Op schema</SelectItem>
                  <SelectItem value="amber">Waarschuwing</SelectItem>
                  <SelectItem value="red">Kritiek</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe SLA
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nieuwe SLA Definitie</DialogTitle>
                    <DialogDescription>
                      Definieer een nieuwe service level agreement
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Naam</Label>
                      <Input 
                        id="name" 
                        placeholder="bijv. Express Delivery SLA" 
                        value={newSLA.name}
                        onChange={(e) => setNewSLA(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="metric">Metriek</Label>
                        <Select 
                          value={newSLA.metric_type}
                          onValueChange={(v) => setNewSLA(prev => ({ ...prev, metric_type: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on_time_delivery">Levertijd</SelectItem>
                            <SelectItem value="otif">OTIF</SelectItem>
                            <SelectItem value="completion_rate">Voltooiingsrate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="target">Target (%)</Label>
                        <Input 
                          id="target" 
                          type="number"
                          placeholder="95" 
                          value={newSLA.target_value}
                          onChange={(e) => setNewSLA(prev => ({ ...prev, target_value: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="period">Meetperiode</Label>
                      <Select 
                        value={newSLA.measurement_period}
                        onValueChange={(v) => setNewSLA(prev => ({ ...prev, measurement_period: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Dagelijks</SelectItem>
                          <SelectItem value="weekly">Wekelijks</SelectItem>
                          <SelectItem value="monthly">Maandelijks</SelectItem>
                          <SelectItem value="quarterly">Kwartaal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Annuleren
                    </Button>
                    <Button 
                      onClick={handleCreateSLA} 
                      disabled={isCreating || !newSLA.name || !newSLA.metric_type}
                    >
                      {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Aanmaken
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-4">
            {isLoadingPerformance ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : slaPerformance.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Geen SLA definities gevonden.</p>
                  <p className="text-sm">Maak een nieuwe SLA aan om te beginnen met monitoren.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredPerformance.map((perf) => (
                  <Card key={perf.sla.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{perf.sla.name}</h3>
                            {getStatusBadge(perf.status)}
                            {!perf.sla.is_active && (
                              <Badge variant="outline">Inactief</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {perf.sla.customer?.company_name || 'Algemeen'} • {perf.sla.metric_type}: {perf.sla.target_value}{perf.sla.target_unit === 'percentage' ? '%' : ` ${perf.sla.target_unit}`}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {perf.currentValue !== null ? `${perf.currentValue}%` : '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">Huidig</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{perf.sla.target_value}%</div>
                            <div className="text-xs text-muted-foreground">Target</div>
                          </div>
                          <div className="w-32">
                            <Progress 
                              value={perf.currentValue !== null ? (perf.currentValue / perf.sla.target_value) * 100 : 0} 
                              className={`h-3 ${
                                perf.status === "ok" ? "[&>div]:bg-emerald-500" :
                                perf.status === "warning" || perf.status === "at_risk" ? "[&>div]:bg-amber-500" :
                                "[&>div]:bg-red-500"
                              }`}
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                              {perf.totalMeasurements} metingen
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="definitions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SLA Definities</CardTitle>
                <CardDescription>
                  Alle geconfigureerde service level agreements
                </CardDescription>
              </CardHeader>
              <CardContent>
                {slaDefinitions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nog geen SLA definities aangemaakt.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-6">
                  <div className="min-w-[600px] px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>Klant</TableHead>
                        <TableHead>Metriek</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Periode</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slaDefinitions.map((sla) => (
                        <TableRow key={sla.id}>
                          <TableCell className="font-medium">{sla.name}</TableCell>
                          <TableCell>{sla.customer?.company_name || 'Algemeen'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{sla.metric_type}</Badge>
                          </TableCell>
                          <TableCell>
                            {sla.target_value}{sla.target_unit === 'percentage' ? '%' : ` ${sla.target_unit}`}
                          </TableCell>
                          <TableCell>{sla.measurement_period || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={sla.is_active ? "default" : "secondary"}>
                              {sla.is_active ? 'Actief' : 'Inactief'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => toggleActive({ id: sla.id, is_active: !sla.is_active })}
                              >
                                <Power className={`h-4 w-4 ${sla.is_active ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteSLA(sla.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SLAMonitoring;
