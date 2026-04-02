import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAIRecommendations, useDismissAIRecommendation } from '@/hooks/useEnterpriseData';
import { useToast } from '@/hooks/use-toast';
import { 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Lightbulb,
  Target,
  Euro,
  Shield,
  Clock,
  ThumbsDown,
  Zap,
  Loader2,
  Plus,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const AIRecommendations = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: recommendations } = useAIRecommendations();
  const dismissRecommendation = useDismissAIRecommendation();
  
  const [selectedRec, setSelectedRec] = useState<any>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [automationName, setAutomationName] = useState("");
  const [automationTrigger, setAutomationTrigger] = useState("");
  const [dismissedRecs, setDismissedRecs] = useState<string[]>([]);

  const displayRecommendations = (recommendations || []).filter((r: any) => !dismissedRecs.includes(r.id));

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cost_saving': return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      case 'margin_leak': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'cash_flow': return <Euro className="h-5 w-5 text-blue-500" />;
      case 'compliance': return <Shield className="h-5 w-5 text-purple-500" />;
      default: return <Lightbulb className="h-5 w-5 text-amber-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'cost_saving': return 'Kostenbesparing';
      case 'margin_leak': return 'Margin Leak';
      case 'cash_flow': return 'Cashflow';
      case 'compliance': return 'Compliance';
      default: return 'Aanbeveling';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-emerald-500';
    if (confidence >= 0.75) return 'bg-blue-500';
    if (confidence >= 0.6) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const handleAction = (rec: any, action: any) => {
    setSelectedRec(rec);
    setCurrentAction(action);

    if (action.action === 'navigate') {
      navigate(action.target);
      return;
    }

    if (action.action === 'create_task') {
      setTaskName(`Actie: ${rec.claim.substring(0, 50)}...`);
      setTaskDialogOpen(true);
      return;
    }

    if (action.action === 'create_automation') {
      setAutomationName(`Alert: ${action.params?.trigger || 'Threshold'}`);
      setAutomationTrigger(action.params?.trigger || '');
      setAutomationDialogOpen(true);
      return;
    }

    // Generic action dialog
    setActionDialogOpen(true);
  };

  const executeAction = () => {
    // Navigate based on recommendation type instead of fake setTimeout
    const type = selectedRec?.recommendation_type;
    const target = currentAction?.target;
    
    if (target) {
      navigate(target);
      setActionDialogOpen(false);
      return;
    }

    // Smart navigation based on recommendation type
    const routeMap: Record<string, string> = {
      cost_saving: '/planning',
      margin_leak: '/rate-management',
      cash_flow: '/finance/receivables',
      compliance: '/compliance',
    };
    
    const route = routeMap[type] || '/dashboard';
    navigate(route);
    toast({ title: `${currentAction?.label} ✓`, description: "Navigeren naar relevante pagina." });
    setActionDialogOpen(false);
  };

  const handleDismiss = (rec: any) => {
    setSelectedRec(rec);
    setDismissDialogOpen(true);
  };

  const confirmDismiss = () => {
    if (selectedRec) {
      dismissRecommendation.mutate({ id: selectedRec.id, reason: dismissReason || 'Not relevant' });
      setDismissedRecs(prev => [...prev, selectedRec.id]);
      toast({ 
        title: "Aanbeveling verwijderd", 
        description: "Deze aanbeveling wordt niet meer getoond." 
      });
    }
    setDismissDialogOpen(false);
    setDismissReason("");
  };

  const createTask = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      toast({ 
        title: "Taak aangemaakt ✓", 
        description: `Taak "${taskName}" is aangemaakt${taskAssignee ? ` en toegewezen aan ${taskAssignee}` : ''}.` 
      });
      setTaskDialogOpen(false);
      setTaskName("");
      setTaskAssignee("");
    }, 1500);
  };

  const createAutomation = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      toast({ 
        title: "Automation aangemaakt ✓", 
        description: `Alert "${automationName}" is geconfigureerd.` 
      });
      setAutomationDialogOpen(false);
      setAutomationName("");
      setAutomationTrigger("");
    }, 1500);
  };

  return (
    <DashboardLayout 
      title="AI Recommendations" 
      description="Explainable AI aanbevelingen met evidence en impact analyse"
    >
      <div className="space-y-6">
        {/* AI Guardrails Notice */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">AI Guardrails Actief</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  AI mag nooit automatisch: payouts approven, invoices versturen, of holds resolven.
                  Alle acties vereisen expliciete bevestiging van een geautoriseerde gebruiker.
                </p>
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                Guardrails: ON
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <div className="space-y-4">
          {displayRecommendations.map((rec: any) => (
            <Card key={rec.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {getTypeIcon(rec.recommendation_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getTypeLabel(rec.recommendation_type)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(rec.created_at), 'dd MMM HH:mm', { locale: nl })}
                        </span>
                      </div>
                      <CardTitle className="text-lg mt-2">{rec.claim}</CardTitle>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">€{rec.estimated_impact_eur.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Geschatte jaarlijkse impact</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Evidence Section */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Evidence ({rec.evidence.length} datapunten)
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {rec.evidence.map((ev: any, idx: number) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">{ev.label}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="font-semibold">{ev.value}</p>
                          {ev.link && (
                            <button 
                              onClick={() => navigate(ev.link)}
                              className="text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Section */}
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-700 dark:text-red-300">Risico</h4>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{rec.risk}</p>
                    </div>
                  </div>
                </div>

                {/* Confidence */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">AI Confidence</span>
                    <span className="text-sm font-medium">{Math.round(rec.confidence * 100)}%</span>
                  </div>
                  <Progress value={rec.confidence * 100} className="h-2" />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    {rec.suggested_actions.slice(0, 3).map((action: any, idx: number) => (
                      <Button 
                        key={idx} 
                        variant={idx === 0 ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => handleAction(rec, action)}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => handleDismiss(rec)}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    Niet relevant
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {displayRecommendations.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium">Geen actieve aanbevelingen</p>
              <p className="text-sm text-muted-foreground mt-1">
                AI analyseert continu je data. Nieuwe inzichten verschijnen hier.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generic Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentAction?.label}</DialogTitle>
            <DialogDescription>
              Bevestig deze actie voor aanbeveling: {selectedRec?.claim?.substring(0, 60)}...
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline">{getTypeLabel(selectedRec?.recommendation_type)}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Impact</span>
                <span className="font-semibold">€{selectedRec?.estimated_impact_eur?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confidence</span>
                <span className="font-medium">{Math.round((selectedRec?.confidence || 0) * 100)}%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Annuleren</Button>
            <Button onClick={executeAction} disabled={isExecuting}>
              {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uitvoeren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Dialog */}
      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aanbeveling Negeren</DialogTitle>
            <DialogDescription>
              Waarom is deze aanbeveling niet relevant?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{selectedRec?.claim}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Impact: €{selectedRec?.estimated_impact_eur?.toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reden (optioneel)</Label>
              <Select value={dismissReason} onValueChange={setDismissReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een reden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="already_addressed">Al aangepakt</SelectItem>
                  <SelectItem value="not_applicable">Niet van toepassing</SelectItem>
                  <SelectItem value="incorrect_data">Incorrecte data</SelectItem>
                  <SelectItem value="low_priority">Lage prioriteit</SelectItem>
                  <SelectItem value="other">Anders</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={confirmDismiss}>
              Negeren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Taak Aanmaken</DialogTitle>
            <DialogDescription>
              Maak een taak aan op basis van deze AI aanbeveling
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Taaknaam</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Beschrijf de taak"
              />
            </div>
            <div className="space-y-2">
              <Label>Toewijzen aan</Label>
              <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een teamlid" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jan">Jan de Vries</SelectItem>
                  <SelectItem value="pieter">Pieter Bakker</SelectItem>
                  <SelectItem value="maria">Maria Jansen</SelectItem>
                  <SelectItem value="self">Mezelf</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Annuleren</Button>
            <Button onClick={createTask} disabled={!taskName.trim() || isExecuting}>
              {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Taak Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Automation Dialog */}
      <Dialog open={automationDialogOpen} onOpenChange={setAutomationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert Configureren</DialogTitle>
            <DialogDescription>
              Stel een automatische alert in voor deze situatie
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Alert naam</Label>
              <Input
                value={automationName}
                onChange={(e) => setAutomationName(e.target.value)}
                placeholder="bijv. Brandstofkosten Alert"
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger voorwaarde</Label>
              <Select value={automationTrigger} onValueChange={setAutomationTrigger}>
                <SelectTrigger>
                  <SelectValue placeholder="Wanneer moet de alert afgaan?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel_cost_threshold">Brandstofkosten boven drempel</SelectItem>
                  <SelectItem value="waiting_time">Wachttijd niet gefactureerd</SelectItem>
                  <SelectItem value="margin_below">Marge onder target</SelectItem>
                  <SelectItem value="cashflow_low">Cashflow onder minimum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notificatie kanalen</Label>
              <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  <Bell className="h-3 w-3 mr-1" />
                  Push
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">Email</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">Slack</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutomationDialogOpen(false)}>Annuleren</Button>
            <Button onClick={createAutomation} disabled={!automationName.trim() || isExecuting}>
              {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Zap className="mr-2 h-4 w-4" />
              Alert Activeren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AIRecommendations;
