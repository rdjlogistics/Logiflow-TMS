import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useCharterGrowth, SalesProcess } from '@/hooks/useCharterGrowth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Kanban, 
  Plus, 
  Building2, 
  Euro, 
  Calendar,
  ArrowRight,
  GripVertical,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const STAGES = [
  { key: 'INTAKE', label: 'Intake', color: 'bg-slate-500' },
  { key: 'QUOTE', label: 'Offerte', color: 'bg-blue-500' },
  { key: 'NEGOTIATE', label: 'Onderhandeling', color: 'bg-amber-500' },
  { key: 'CONTRACT', label: 'Contract', color: 'bg-purple-500' },
  { key: 'ONBOARD', label: 'Onboarding', color: 'bg-cyan-500' },
  { key: 'LIVE', label: 'Live', color: 'bg-emerald-500' },
];

const SalesPipeline = () => {
  const { salesProcesses, salesLoading, updateSalesStage } = useCharterGrowth();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const { toast } = useToast();

  const [newDealDialogOpen, setNewDealDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<SalesProcess | null>(null);
  
  const handleNewDeal = () => {
    toast({
      title: "Nieuwe deal starten",
      description: "Navigeer naar Klanten om een nieuwe sales deal aan te maken.",
    });
    // Simulate opening a quick-add modal (in production, open a dialog)
    window.location.href = "/customers";
  };

  const handleDealOptions = (processId: string) => {
    const process = salesProcesses.find(p => p.id === processId);
    if (!process) return;
    
    setSelectedDeal(process);
    toast({
      title: `Deal: ${process.title}`,
      description: `Klant: ${process.customer?.company_name || 'Onbekend'} | Kans: ${process.probability_percent || 0}%`,
    });
  };

  const handleMoveToNextStage = async (process: SalesProcess) => {
    const currentIndex = STAGES.findIndex(s => s.key === process.stage);
    if (currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1].key;
      await updateSalesStage.mutateAsync({ id: process.id, stage: nextStage });
      toast({
        title: "Deal verplaatst",
        description: `${process.title} is nu in ${STAGES[currentIndex + 1].label}`,
      });
    }
  };


  const getProcessesByStage = (stage: string) => 
    salesProcesses.filter(p => p.stage === stage);

  const getTotalValueByStage = (stage: string) => {
    const processes = getProcessesByStage(stage);
    return processes.reduce((sum, p) => sum + (p.value_estimate || 0), 0);
  };

  const handleDragStart = (e: React.DragEvent, processId: string) => {
    setDraggingId(processId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggingId) {
      await updateSalesStage.mutateAsync({ id: draggingId, stage });
    }
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  return (
    <DashboardLayout title="Sales Pipeline" description="Quote-to-Contract workflow beheren">
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Kanban className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{salesProcesses.length}</p>
                  <p className="text-xs text-muted-foreground">Totaal Deals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Euro className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(salesProcesses.reduce((sum, p) => sum + (p.value_estimate || 0), 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">Pipeline Waarde</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {getProcessesByStage('CONTRACT').length}
                  </p>
                  <p className="text-xs text-muted-foreground">In Contract</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <ArrowRight className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-600">
                    {getProcessesByStage('LIVE').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Live Klanten</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pipeline Board</h2>
          <Button size="sm" onClick={handleNewDeal}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Deal
          </Button>
        </div>

        {/* Kanban Board */}
        {salesLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map((stage) => (
              <div
                key={stage.key}
                className="flex-shrink-0 w-72"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <Card className="h-full">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', stage.color)} />
                        <CardTitle className="text-sm font-medium">{stage.label}</CardTitle>
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {getProcessesByStage(stage.key).length}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(getTotalValueByStage(stage.key))}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 pt-0 space-y-2 min-h-[300px]">
                    {getProcessesByStage(stage.key).map((process) => (
                      <div
                        key={process.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, process.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'p-3 bg-background rounded-lg border border-border/50 cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-sm transition-all',
                          draggingId === process.id && 'opacity-50 border-primary'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{process.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {process.customer?.company_name || 'Onbekende klant'}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleDealOptions(process.id)}>
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between text-xs">
                          {process.value_estimate ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                              <Euro className="h-3 w-3 mr-0.5" />
                              {formatCurrency(process.value_estimate)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Geen waarde</span>
                          )}
                          {process.expected_close_date && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(process.expected_close_date), 'd MMM', { locale: nl })}
                            </span>
                          )}
                        </div>
                        
                        {process.probability_percent && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span>Kans</span>
                              <span>{process.probability_percent}%</span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${process.probability_percent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {getProcessesByStage(stage.key).length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Kanban className="h-6 w-6 opacity-30 mb-2" />
                        <p className="text-xs">Sleep deals hierheen</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SalesPipeline;
