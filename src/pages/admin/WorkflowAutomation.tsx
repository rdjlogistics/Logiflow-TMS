import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Settings,
  ArrowRight,
  Package,
  RefreshCw,
  AlertTriangle,
  User,
  FileText,
  Globe,
  Mail,
  MessageSquare,
  Webhook,
  CheckSquare,
  Hash,
  Phone,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useWorkflowAutomation, WORKFLOW_TRIGGERS, WORKFLOW_ACTIONS, WORKFLOW_TEMPLATES, type WorkflowAction } from "@/hooks/useWorkflowAutomation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const iconMap: Record<string, React.ReactNode> = {
  Package: <Package className="h-4 w-4" />,
  RefreshCw: <RefreshCw className="h-4 w-4" />,
  AlertTriangle: <AlertTriangle className="h-4 w-4" />,
  User: <User className="h-4 w-4" />,
  FileText: <FileText className="h-4 w-4" />,
  Globe: <Globe className="h-4 w-4" />,
  Mail: <Mail className="h-4 w-4" />,
  MessageSquare: <MessageSquare className="h-4 w-4" />,
  Webhook: <Webhook className="h-4 w-4" />,
  CheckSquare: <CheckSquare className="h-4 w-4" />,
  Hash: <Hash className="h-4 w-4" />,
  Phone: <Phone className="h-4 w-4" />,
};

const WorkflowAutomation = () => {
  const {
    workflows,
    isLoadingWorkflows,
    recentRuns,
    createWorkflow,
    toggleWorkflow,
    deleteWorkflow,
    triggerWorkflow,
  } = useWorkflowAutomation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    trigger_type: "",
    trigger_config: {} as Record<string, any>,
    actions: [] as WorkflowAction[],
  });

  const selectedTrigger = WORKFLOW_TRIGGERS.find(t => t.type === newWorkflow.trigger_type);

  const handleAddAction = (actionType: string) => {
    const actionDef = WORKFLOW_ACTIONS.find(a => a.type === actionType);
    if (!actionDef) return;

    const newAction: WorkflowAction = {
      action_type: actionType,
      action_config: {},
      sequence_order: newWorkflow.actions.length,
      delay_minutes: 0,
      is_active: true,
    };
    
    setNewWorkflow(prev => ({
      ...prev,
      actions: [...prev.actions, newAction],
    }));
  };

  const handleUpdateActionConfig = (index: number, field: string, value: any) => {
    setNewWorkflow(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index 
          ? { ...action, action_config: { ...action.action_config, [field]: value } }
          : action
      ),
    }));
  };

  const handleRemoveAction = (index: number) => {
    setNewWorkflow(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name || !newWorkflow.trigger_type) return;

    // Get tenant_id from user session
    const { data: { user } } = await (await import('@/integrations/supabase/client')).supabase.auth.getUser();
    if (!user) return;

    const { data: userCompany } = await (await import('@/integrations/supabase/client')).supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!userCompany) return;

    await createWorkflow.mutateAsync({
      tenant_id: userCompany.company_id,
      name: newWorkflow.name,
      description: newWorkflow.description,
      trigger_type: newWorkflow.trigger_type,
      trigger_config: newWorkflow.trigger_config,
      is_active: true,
      actions: newWorkflow.actions,
    });

    setIsCreateOpen(false);
    setNewWorkflow({
      name: "",
      description: "",
      trigger_type: "",
      trigger_config: {},
      actions: [],
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout
      title="Workflow Automation"
      description="No-code automatiseringen voor je transportprocessen"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              {workflows?.filter(w => w.is_active).length || 0} actief
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3 w-3" />
              {recentRuns?.length || 0} runs vandaag
            </Badge>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Nieuwe Workflow aanmaken</DialogTitle>
                <DialogDescription>
                  Configureer een automatische actie die getriggerd wordt door events
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6 pb-4">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Workflow naam</Label>
                      <Input
                        placeholder="bijv. Klant notificatie bij vertraging"
                        value={newWorkflow.name}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Beschrijving (optioneel)</Label>
                      <Textarea
                        placeholder="Wat doet deze workflow?"
                        value={newWorkflow.description}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Trigger Selection */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Wanneer triggeren?</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {WORKFLOW_TRIGGERS.map((trigger) => (
                        <button
                          key={trigger.type}
                          onClick={() => setNewWorkflow(prev => ({ 
                            ...prev, 
                            trigger_type: trigger.type,
                            trigger_config: {},
                          }))}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            newWorkflow.trigger_type === trigger.type
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-muted">
                              {iconMap[trigger.icon]}
                            </div>
                            <div>
                              <p className="font-medium">{trigger.label}</p>
                              <p className="text-xs text-muted-foreground">{trigger.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Trigger Config Fields */}
                    {selectedTrigger?.configFields && (
                      <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                        <p className="text-sm font-medium">Trigger configuratie</p>
                        {selectedTrigger.configFields.map((field) => (
                          <div key={field.name} className="space-y-2">
                            <Label>{field.label}</Label>
                            {field.type === 'select' ? (
                              <Select
                                value={newWorkflow.trigger_config[field.name] || ''}
                                onValueChange={(value) => setNewWorkflow(prev => ({
                                  ...prev,
                                  trigger_config: { ...prev.trigger_config, [field.name]: value },
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecteer..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options?.map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type={field.type}
                                value={newWorkflow.trigger_config[field.name] || ''}
                                onChange={(e) => setNewWorkflow(prev => ({
                                  ...prev,
                                  trigger_config: { ...prev.trigger_config, [field.name]: e.target.value },
                                }))}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-semibold">Wat moet er gebeuren?</Label>
                      <Select onValueChange={handleAddAction}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Actie toevoegen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {WORKFLOW_ACTIONS.map((action) => (
                            <SelectItem key={action.type} value={action.type}>
                              <div className="flex items-center gap-2">
                                {iconMap[action.icon]}
                                {action.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action List */}
                    <div className="space-y-3">
                      {newWorkflow.actions.map((action, index) => {
                        const actionDef = WORKFLOW_ACTIONS.find(a => a.type === action.action_type);
                        if (!actionDef) return null;

                        return (
                          <div key={index} className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                  {index + 1}
                                </div>
                                <div className="p-2 rounded-md bg-muted">
                                  {iconMap[actionDef.icon]}
                                </div>
                                <span className="font-medium">{actionDef.label}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAction(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>

                            <div className="space-y-3 pl-9">
                              {actionDef.configFields.map((field) => (
                                <div key={field.name} className="space-y-1">
                                  <Label className="text-sm">{field.label}</Label>
                                  {field.type === 'textarea' ? (
                                    <Textarea
                                      placeholder={field.placeholder}
                                      value={action.action_config[field.name] || ''}
                                      onChange={(e) => handleUpdateActionConfig(index, field.name, e.target.value)}
                                      rows={2}
                                    />
                                  ) : field.type === 'select' ? (
                                    <Select
                                      value={action.action_config[field.name] || ''}
                                      onValueChange={(value) => handleUpdateActionConfig(index, field.name, value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecteer..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {field.options?.map((opt) => (
                                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input
                                      type={field.type}
                                      placeholder={field.placeholder}
                                      value={action.action_config[field.name] || ''}
                                      onChange={(e) => handleUpdateActionConfig(index, field.name, e.target.value)}
                                    />
                                  )}
                                </div>
                              ))}

                              <div className="flex items-center gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <Label className="text-sm">Vertraging:</Label>
                                  <Input
                                    type="number"
                                    className="w-20"
                                    value={action.delay_minutes}
                                    onChange={(e) => setNewWorkflow(prev => ({
                                      ...prev,
                                      actions: prev.actions.map((a, i) => 
                                        i === index ? { ...a, delay_minutes: parseInt(e.target.value) || 0 } : a
                                      ),
                                    }))}
                                  />
                                  <span className="text-sm text-muted-foreground">min</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {newWorkflow.actions.length === 0 && (
                        <div className="p-8 rounded-lg border border-dashed text-center text-muted-foreground">
                          <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Voeg acties toe die uitgevoerd moeten worden</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Annuleren
                </Button>
                <Button
                  onClick={handleCreateWorkflow}
                  disabled={!newWorkflow.name || !newWorkflow.trigger_type || newWorkflow.actions.length === 0}
                >
                  Workflow aanmaken
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="workflows" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="runs">Uitvoeringslog</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="space-y-4">
            {isLoadingWorkflows ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : workflows?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Geen workflows</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Maak je eerste workflow aan om processen te automatiseren
                  </p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Eerste workflow aanmaken
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {workflows?.map((workflow) => {
                  const trigger = WORKFLOW_TRIGGERS.find(t => t.type === workflow.trigger_type);
                  
                  return (
                    <Card key={workflow.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${workflow.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                              <Zap className={`h-5 w-5 ${workflow.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <CardTitle className="text-base">{workflow.name}</CardTitle>
                              {workflow.description && (
                                <CardDescription>{workflow.description}</CardDescription>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={workflow.is_active}
                              onCheckedChange={(checked) => toggleWorkflow.mutate({ id: workflow.id, is_active: checked })}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => triggerWorkflow(workflow.id, { test: true })}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteWorkflow.mutate(workflow.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted">
                            {trigger && iconMap[trigger.icon]}
                            <span>{trigger?.label || workflow.trigger_type}</span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="secondary">
                            {workflow.run_count} uitvoeringen
                          </Badge>
                          {workflow.last_run_at && (
                            <span className="text-muted-foreground">
                              Laatste: {new Date(workflow.last_run_at).toLocaleDateString('nl-NL')}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="runs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recente uitvoeringen</CardTitle>
                <CardDescription>Overzicht van workflow runs</CardDescription>
              </CardHeader>
              <CardContent>
                {recentRuns?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nog geen uitvoeringen</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentRuns?.map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(run.status)}
                          <div>
                            <p className="text-sm font-medium">
                              {workflows?.find(w => w.id === run.workflow_id)?.name || 'Workflow'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(run.started_at).toLocaleString('nl-NL')}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            run.status === 'completed' ? 'default' :
                            run.status === 'failed' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {run.status}
                        </Badge>
                      </div>
                    ))}
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

export default WorkflowAutomation;
