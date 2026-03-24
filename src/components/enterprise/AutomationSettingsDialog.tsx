import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Settings2, Loader2, Zap, Shield, Clock } from "lucide-react";

interface AutomationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation: {
    name: string;
    trigger: string;
    version: string;
    status: string;
  } | null;
  onSave?: (settings: any) => void;
}

export function AutomationSettingsDialog({ open, onOpenChange, automation, onSave }: AutomationSettingsDialogProps) {
  const [isActive, setIsActive] = useState(automation?.status === "Actief");
  const [runSchedule, setRunSchedule] = useState("realtime");
  const [maxBatchSize, setMaxBatchSize] = useState("100");
  const [retryCount, setRetryCount] = useState("3");
  const [alertOnFailure, setAlertOnFailure] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (!automation) return;
    
    onSave?.({
      isActive,
      runSchedule,
      maxBatchSize: parseInt(maxBatchSize),
      retryCount: parseInt(retryCount),
      alertOnFailure,
      requireApproval
    });
    
    toast({
      title: "Instellingen opgeslagen ✓",
      description: `Configuratie voor "${automation.name}" is bijgewerkt.`
    });
    
    onOpenChange(false);
  };

  if (!automation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Automation Instellingen
          </DialogTitle>
          <DialogDescription>
            {automation.name} (v{automation.version})
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Algemeen</TabsTrigger>
            <TabsTrigger value="execution">Uitvoering</TabsTrigger>
            <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Automation Actief</Label>
                <p className="text-sm text-muted-foreground">
                  Schakel de automation in of uit
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="space-y-2">
              <Label>Trigger</Label>
              <Input value={automation.trigger} disabled className="bg-muted text-base" />
              <p className="text-xs text-muted-foreground">
                De trigger kan alleen via een nieuwe versie worden gewijzigd
              </p>
            </div>
          </TabsContent>

          <TabsContent value="execution" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Run Schema
              </Label>
              <Select value={runSchedule} onValueChange={setRunSchedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time (bij event)</SelectItem>
                  <SelectItem value="hourly">Elk uur</SelectItem>
                  <SelectItem value="daily">Dagelijks</SelectItem>
                  <SelectItem value="manual">Alleen handmatig</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Max Batch Size</Label>
              <Input 
                type="number" 
                value={maxBatchSize}
                onChange={(e) => setMaxBatchSize(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum aantal items per run
              </p>
            </div>

            <div className="space-y-2">
              <Label>Retry Pogingen</Label>
              <Select value={retryCount} onValueChange={setRetryCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Geen retries</SelectItem>
                  <SelectItem value="1">1 poging</SelectItem>
                  <SelectItem value="3">3 pogingen</SelectItem>
                  <SelectItem value="5">5 pogingen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="guardrails" className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Alert bij Failure
                </Label>
                <p className="text-sm text-muted-foreground">
                  Stuur notificatie bij gefaalde runs
                </p>
              </div>
              <Switch checked={alertOnFailure} onCheckedChange={setAlertOnFailure} />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Goedkeuring Vereist
                </Label>
                <p className="text-sm text-muted-foreground">
                  Acties vereisen handmatige goedkeuring
                </p>
              </div>
              <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
            </div>

            {requireApproval && (
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-600">
                  ⚠️ Met goedkeuring vereist zullen alle acties wachten op bevestiging voordat ze worden uitgevoerd.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
