import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Truck, Clock, Timer, MapPin, FileText, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriverAppSettings {
  driver_app_use_arrival_departure_times: boolean;
  driver_app_separate_remarks_field: boolean;
  driver_app_auto_save_waiting: boolean;
  driver_app_auto_save_loading: boolean;
  driver_app_auto_save_distance: boolean;
  driver_app_show_waybill: boolean;
  driver_app_show_cmr: boolean;
  driver_app_completed_stops_bottom: boolean;
}

interface DriverAppSettingsTabProps {
  settings: DriverAppSettings;
  onSettingsChange: (updates: Partial<DriverAppSettings>) => void;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export const DriverAppSettingsTab = ({ settings, onSettingsChange }: DriverAppSettingsTabProps) => {
  const ToggleRow = ({ 
    icon: Icon, label, description, checked, onCheckedChange, disabled = false,
  }: { 
    icon: React.ElementType; label: string; description: string; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean;
  }) => (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-xl min-h-[52px]",
        "bg-card/40 backdrop-blur-sm border border-border/30",
        "hover:bg-card/60 transition-colors",
        disabled && "opacity-50"
      )}
      whileHover={disabled ? {} : { scale: 1.005 }}
    >
      <div className="space-y-0.5 flex-1 mr-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <Label className="text-sm md:text-base font-medium">{label}</Label>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="shrink-0" />
    </div>
  );

  return (
    <div
      className="space-y-4 md:space-y-6"
    >
      {/* Afmeldgedrag */}
      <div>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Afmeldgedrag</CardTitle>
                <CardDescription>Bepaal hoe tijden worden vastgelegd bij het afmelden</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow icon={Clock} label="Aankomst- en vertrektijd gebruiken" description="Chauffeur geeft alleen aankomst- en vertrektijd op. Geen losse wacht- of laadtijd velden." checked={settings.driver_app_use_arrival_departure_times} onCheckedChange={(v) => onSettingsChange({ driver_app_use_arrival_departure_times: v })} />
            <ToggleRow icon={FileText} label="Apart opmerkingenveld voor chauffeursopmerkingen" description="Opmerkingen zijn alleen zichtbaar in de planomgeving, niet voor klanten op Track & Trace." checked={settings.driver_app_separate_remarks_field} onCheckedChange={(v) => onSettingsChange({ driver_app_separate_remarks_field: v })} />
          </CardContent>
        </Card>
      </div>

      {/* Automatisch verwerken */}
      <div>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
                <Timer className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Automatisch verwerken</CardTitle>
                <CardDescription>Afmeldgegevens direct opslaan bij de prijsberekening van de order</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow icon={Timer} label="Wachttijd direct opslaan in het wachttijd veld" description="Wachttijden worden direct verwerkt bij de prijsberekening. Bij meerdere stops worden ze opgeteld." checked={settings.driver_app_auto_save_waiting} onCheckedChange={(v) => onSettingsChange({ driver_app_auto_save_waiting: v })} disabled={settings.driver_app_use_arrival_departure_times} />
            <ToggleRow icon={Truck} label="Laad/lostijd direct opslaan in het laad/lostijd veld" description="Laad- en lostijden worden direct verwerkt bij de prijsberekening. Bij meerdere stops opgeteld." checked={settings.driver_app_auto_save_loading} onCheckedChange={(v) => onSettingsChange({ driver_app_auto_save_loading: v })} disabled={settings.driver_app_use_arrival_departure_times} />
            <ToggleRow icon={MapPin} label="Afstand totale rit direct opslaan in het inkoop afstand veld" description="De opgegeven gereden afstand bij de laatste stop wordt direct opgeslagen als inkoop afstand." checked={settings.driver_app_auto_save_distance} onCheckedChange={(v) => onSettingsChange({ driver_app_auto_save_distance: v })} />
          </CardContent>
        </Card>
      </div>

      {/* Weergave */}
      <div>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Weergave in Chauffeurs App</CardTitle>
                <CardDescription>Documenten en volgorde in de chauffeurs app</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow icon={FileText} label="De vrachtbrief weergeven in de Chauffeurs App" description="Chauffeurs kunnen de vrachtbrief van de toegewezen order digitaal inzien." checked={settings.driver_app_show_waybill} onCheckedChange={(v) => onSettingsChange({ driver_app_show_waybill: v })} />
            <ToggleRow icon={FileText} label="De CMR weergeven in de Chauffeurs App" description="Chauffeurs kunnen de CMR van de toegewezen order digitaal inzien." checked={settings.driver_app_show_cmr} onCheckedChange={(v) => onSettingsChange({ driver_app_show_cmr: v })} />
            <ToggleRow icon={List} label="Afgemelde bestemmingen onderaan weergeven" description="Afgemelde stops worden onderaan de lijst geplaatst. De volgende bestemming staat dan bovenaan." checked={settings.driver_app_completed_stops_bottom} onCheckedChange={(v) => onSettingsChange({ driver_app_completed_stops_bottom: v })} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
