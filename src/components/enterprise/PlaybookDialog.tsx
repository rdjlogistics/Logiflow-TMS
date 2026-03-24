import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Play, Plus, Loader2, Trash2 } from "lucide-react";

interface PlaybookAction {
  type: string;
  config: string;
}

interface PlaybookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (playbook: { name: string; trigger: string; actions: PlaybookAction[] }) => void;
}

export function PlaybookDialog({ open, onOpenChange, onSave }: PlaybookDialogProps) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState<PlaybookAction[]>([
    { type: "ping_driver", config: "" }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addAction = () => {
    setActions([...actions, { type: "send_notification", config: "" }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: "type" | "config", value: string) => {
    const updated = [...actions];
    updated[index][field] = value;
    setActions(updated);
  };

  const handleSave = () => {
    if (!name.trim() || !trigger) return;
    
    onSave?.({ name, trigger, actions });
    toast({
      title: "Playbook aangemaakt ✓",
      description: `"${name}" is opgeslagen en actief.`
    });
    
    setName("");
    setTrigger("");
    setDescription("");
    setActions([{ type: "ping_driver", config: "" }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Nieuw Exception Playbook
          </DialogTitle>
          <DialogDescription>
            Configureer geautomatiseerde acties voor specifieke exception types
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Playbook Naam</Label>
            <Input 
              placeholder="bijv. Late Pickup Response"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Trigger Exception Type</Label>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer exception type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="late_pickup">Late Pickup</SelectItem>
                <SelectItem value="late_delivery">Late Delivery</SelectItem>
                <SelectItem value="no_signal">No Signal / GPS Lost</SelectItem>
                <SelectItem value="waiting_time">Excessive Waiting Time</SelectItem>
                <SelectItem value="route_deviation">Route Deviation</SelectItem>
                <SelectItem value="temperature_breach">Temperature Breach</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Beschrijving (optioneel)</Label>
            <Textarea 
              placeholder="Beschrijf wat dit playbook doet..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Acties</Label>
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="h-3 w-3 mr-1" />
                Actie
              </Button>
            </div>
            
            {actions.map((action, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                <Select 
                  value={action.type} 
                  onValueChange={(v) => updateAction(index, "type", v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ping_driver">Ping chauffeur</SelectItem>
                    <SelectItem value="send_notification">Stuur notificatie</SelectItem>
                    <SelectItem value="notify_customer">Informeer klant</SelectItem>
                    <SelectItem value="escalate">Escaleer naar planner</SelectItem>
                    <SelectItem value="create_task">Maak taak aan</SelectItem>
                    <SelectItem value="log_event">Log event</SelectItem>
                  </SelectContent>
                </Select>
                {actions.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeAction(index)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="active" defaultChecked />
            <Label htmlFor="active" className="text-sm font-normal">
              Direct activeren na aanmaken
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !trigger || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Playbook Aanmaken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
