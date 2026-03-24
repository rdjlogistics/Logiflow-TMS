import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Bell, Loader2 } from "lucide-react";

interface AlertRule {
  id: string;
  name: string;
  trigger: string;
  channels: string[];
  recipients: string;
  level: string;
  autoEscalate: string;
  status: string;
}

interface AlertRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AlertRule | null;
  onSave?: (rule: Partial<AlertRule>) => void;
}

export function AlertRuleDialog({ open, onOpenChange, rule, onSave }: AlertRuleDialogProps) {
  const [name, setName] = useState(rule?.name || "");
  const [trigger, setTrigger] = useState(rule?.trigger || "");
  const [level, setLevel] = useState(rule?.level || "L1");
  const [autoEscalate, setAutoEscalate] = useState(rule?.autoEscalate || "15 min");
  const [recipients, setRecipients] = useState(rule?.recipients || "");
  const [channels, setChannels] = useState<string[]>(rule?.channels || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !trigger.trim()) return;
    
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onSave?.({
      id: rule?.id || `ALT-${Date.now()}`,
      name,
      trigger,
      level,
      autoEscalate,
      recipients,
      channels,
      status: "active"
    });
    
    toast({
      title: rule ? "Regel bijgewerkt ✓" : "Regel aangemaakt ✓",
      description: `Alert regel "${name}" is opgeslagen.`
    });
    
    setIsSaving(false);
    onOpenChange(false);
  };

  const toggleChannel = (channel: string) => {
    setChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {rule ? "Regel Bewerken" : "Nieuwe Alert Regel"}
          </DialogTitle>
          <DialogDescription>
            Configureer wanneer en hoe alerts worden getriggerd
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Naam</Label>
            <Input 
              placeholder="bijv. Kritieke exceptions"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Trigger conditie</Label>
            <Input 
              placeholder="bijv. Exception severity = Critical"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Escalatie Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L1">L1 - Standaard</SelectItem>
                  <SelectItem value="L2">L2 - Urgent</SelectItem>
                  <SelectItem value="L3">L3 - Kritiek</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Auto-escalatie na</Label>
              <Select value={autoEscalate} onValueChange={setAutoEscalate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5 min">5 minuten</SelectItem>
                  <SelectItem value="10 min">10 minuten</SelectItem>
                  <SelectItem value="15 min">15 minuten</SelectItem>
                  <SelectItem value="30 min">30 minuten</SelectItem>
                  <SelectItem value="1 uur">1 uur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ontvangers</Label>
            <Input 
              placeholder="bijv. Planning Team"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notificatie kanalen</Label>
            <div className="flex flex-wrap gap-4 pt-2">
              {["Email", "SMS", "Push", "Slack", "Teams"].map((channel) => (
                <div key={channel} className="flex items-center space-x-2">
                  <Checkbox 
                    id={channel}
                    checked={channels.includes(channel)}
                    onCheckedChange={() => toggleChannel(channel)}
                  />
                  <Label htmlFor={channel} className="text-sm font-normal">
                    {channel}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !trigger.trim() || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {rule ? "Opslaan" : "Aanmaken"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
