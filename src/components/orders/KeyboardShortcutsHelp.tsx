import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: { group: string; items: Shortcut[] }[] = [
  {
    group: "Navigatie",
    items: [
      { keys: ["N"], description: "Nieuwe order aanmaken" },
      { keys: ["/"], description: "Focus op zoekbalk" },
      { keys: ["Esc"], description: "Zoekbalk wissen" },
      { keys: ["⌘", "K"], description: "Command palette openen" },
    ],
  },
  {
    group: "Selectie",
    items: [
      { keys: ["⌘", "A"], description: "Alles selecteren" },
      { keys: ["⌘", "D"], description: "Selectie deselecteren" },
      { keys: ["↑", "↓"], description: "Navigeer door orders" },
      { keys: ["Enter"], description: "Order openen" },
    ],
  },
  {
    group: "Acties",
    items: [
      { keys: ["⌘", "E"], description: "Exporteren" },
      { keys: ["⌘", "I"], description: "Importeren" },
      { keys: ["⌘", "Z"], description: "Ongedaan maken" },
      { keys: ["?"], description: "Sneltoetsen tonen" },
    ],
  },
];

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KeyboardShortcutsHelp = ({ open, onOpenChange }: KeyboardShortcutsHelpProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Sneltoetsen
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {shortcuts.map((group) => (
            <div key={group.group}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {group.group}
              </h4>
              <div className="space-y-2">
                {group.items.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <Badge
                          key={keyIdx}
                          variant="outline"
                          className="h-6 min-w-6 px-1.5 justify-center font-mono text-xs"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Druk op <Badge variant="outline" className="text-[10px] px-1 mx-1">?</Badge> om dit menu te openen
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;
