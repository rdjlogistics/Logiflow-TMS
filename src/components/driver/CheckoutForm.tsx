import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Check, Loader2, User, Clock, Timer, FileText, Truck, MapPin, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useOrderSubstatuses } from '@/hooks/useOrderSubstatuses';

export interface CheckoutFormData {
  receiverFirstName: string;
  receiverLastName: string;
  arrivalTime: string;
  departureTime: string;
  waitingMinutes: number;
  loadingMinutes: number;
  actualDistanceKm: number | null;
  subStatus: string | null;
  note: string;
}

interface CheckoutFormProps {
  stop: {
    company_name: string | null;
    address: string;
    city: string | null;
  };
  isLastStop?: boolean;
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  onCancel: () => void;
}

export const CheckoutForm = ({ stop, isLastStop = false, onSubmit, onCancel }: CheckoutFormProps) => {
  const [loading, setLoading] = useState(false);
  const { data: tenantSettings } = useTenantSettings();
  const { data: substatuses = [] } = useOrderSubstatuses({ driverAppOnly: true });

  const useArrivalDeparture = tenantSettings?.driver_app_use_arrival_departure_times ?? false;

  const [formData, setFormData] = useState<CheckoutFormData>({
    receiverFirstName: '',
    receiverLastName: '',
    arrivalTime: format(new Date(), 'HH:mm'),
    departureTime: format(new Date(), 'HH:mm'),
    waitingMinutes: 0,
    loadingMinutes: 0,
    actualDistanceKm: null,
    subStatus: null,
    note: '',
  });

  // Auto-calculate waiting minutes when times change (only in arrival/departure mode)
  useEffect(() => {
    if (useArrivalDeparture && formData.arrivalTime && formData.departureTime) {
      const [arrH, arrM] = formData.arrivalTime.split(':').map(Number);
      const [depH, depM] = formData.departureTime.split(':').map(Number);
      const diff = Math.max(0, (depH * 60 + depM) - (arrH * 60 + arrM));
      setFormData(prev => ({ ...prev, waitingMinutes: diff }));
    }
  }, [formData.arrivalTime, formData.departureTime, useArrivalDeparture]);

  const isValid =
    formData.receiverFirstName.trim() !== '' &&
    formData.receiverLastName.trim() !== '' &&
    formData.arrivalTime !== '' &&
    formData.departureTime !== '';

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  const SettingRow = ({ icon: Icon, iconColor, label, children }: { icon: React.ElementType; iconColor: string; label: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <div className={`w-6 h-6 rounded-md ${iconColor} flex items-center justify-center`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {label}
      </div>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold text-lg">Afmelding voltooien</h2>
          <div className="w-10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1">
            <div className="flex-1 h-1.5 rounded-full bg-primary" />
            <div className="flex-1 h-1.5 rounded-full bg-primary" />
            <div className="flex-1 h-1.5 rounded-full bg-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">3/3</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Stop info */}
        <Card className="mb-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base truncate">{stop.company_name || stop.address}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {stop.address}, {stop.city}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          {/* Receiver name */}
          <SettingRow icon={User} iconColor="bg-blue-500/10 text-blue-500" label="Ontvanger">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium">Voornaam *</Label>
                <Input
                  id="firstName"
                  placeholder="Jan"
                  value={formData.receiverFirstName}
                  onChange={(e) => setFormData({ ...formData, receiverFirstName: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">Achternaam *</Label>
                <Input
                  id="lastName"
                  placeholder="Jansen"
                  value={formData.receiverLastName}
                  onChange={(e) => setFormData({ ...formData, receiverLastName: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
            </div>
          </SettingRow>

          {/* Times */}
          <SettingRow icon={Clock} iconColor="bg-amber-500/10 text-amber-500" label="Tijden">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="arrivalTime" className="text-sm font-medium">Aankomst *</Label>
                <Input
                  id="arrivalTime"
                  type="time"
                  value={formData.arrivalTime}
                  onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="departureTime" className="text-sm font-medium">Vertrek *</Label>
                <Input
                  id="departureTime"
                  type="time"
                  value={formData.departureTime}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
            </div>

            {/* Waiting/loading time fields — only if NOT using arrival/departure mode */}
            {!useArrivalDeparture && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="waitingMinutes" className="text-sm font-medium">
                    <div className="flex items-center gap-1.5">
                      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                      Wachttijd (min)
                    </div>
                  </Label>
                  <Input
                    id="waitingMinutes"
                    type="number"
                    min={0}
                    value={formData.waitingMinutes}
                    onChange={(e) => setFormData({ ...formData, waitingMinutes: parseInt(e.target.value) || 0 })}
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loadingMinutes" className="text-sm font-medium">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                      Laad/lostijd (min)
                    </div>
                  </Label>
                  <Input
                    id="loadingMinutes"
                    type="number"
                    min={0}
                    value={formData.loadingMinutes}
                    onChange={(e) => setFormData({ ...formData, loadingMinutes: parseInt(e.target.value) || 0 })}
                    className="h-12 text-base"
                  />
                </div>
              </div>
            )}

            {/* Waiting time display in arrival/departure mode */}
            {useArrivalDeparture && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mt-3">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Totale tijd op locatie</span>
                </div>
                <span className="font-semibold text-base">{formData.waitingMinutes} min</span>
              </div>
            )}
          </SettingRow>

          {/* Distance — only for last stop */}
          {isLastStop && (
            <SettingRow icon={MapPin} iconColor="bg-purple-500/10 text-purple-500" label="Gereden afstand">
              <div className="space-y-1.5">
                <Label htmlFor="actualDistanceKm" className="text-sm font-medium">
                  Totale afstand (km) <span className="text-xs font-normal text-muted-foreground">(optioneel)</span>
                </Label>
                <Input
                  id="actualDistanceKm"
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="bijv. 245.5"
                  value={formData.actualDistanceKm ?? ''}
                  onChange={(e) => setFormData({ ...formData, actualDistanceKm: e.target.value ? parseFloat(e.target.value) : null })}
                  className="h-12 text-base"
                />
              </div>
            </SettingRow>
          )}

          {/* Substatus dropdown */}
          {substatuses.length > 0 && (
            <SettingRow icon={Tag} iconColor="bg-orange-500/10 text-orange-500" label="Substatus">
              <Select
                value={formData.subStatus || 'none'}
                onValueChange={(val) => setFormData({ ...formData, subStatus: val === 'none' ? null : val })}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecteer substatus (optioneel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen substatus</SelectItem>
                  {substatuses.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      <div className="flex items-center gap-2">
                        {s.color && (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        )}
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
          )}

          {/* Note */}
          <SettingRow icon={FileText} iconColor="bg-green-500/10 text-green-500" label="Opmerking">
            <Textarea
              placeholder="Bijv. ontvangen door buurman, schade geconstateerd..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              maxLength={240}
              rows={3}
              className="text-base resize-none"
            />
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">{formData.note.length}/240</span>
            </div>
          </SettingRow>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        <Button
          className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 shadow-lg"
          onClick={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Verwerken...
            </>
          ) : (
            <>
              <Check className="h-5 w-5 mr-2" />
              Opslaan en afmelden
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
