import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Fingerprint, Plus, Trash2, Smartphone, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface WebAuthnDevice {
  id: string;
  credential_id: string;
  device_name: string;
  created_at: string;
  sign_count: number;
}

export function BiometricSettings() {
  const { isSupported, hasCredential, loading, register } = useWebAuthn();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['webauthn-devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webauthn_credentials')
        .select('id, credential_id, device_name, created_at, sign_count')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as WebAuthnDevice[];
    },
  });

  const handleRegister = async () => {
    const success = await register();
    if (success) {
      toast({ title: 'Apparaat geregistreerd', description: 'Biometrische login is ingesteld voor dit apparaat.' });
      queryClient.invalidateQueries({ queryKey: ['webauthn-devices'] });
    } else {
      toast({ title: 'Registratie mislukt', description: 'Probeer het opnieuw.', variant: 'destructive' });
    }
  };

  const handleDelete = async (device: WebAuthnDevice) => {
    setDeletingId(device.id);
    try {
      const { error } = await supabase
        .from('webauthn_credentials')
        .delete()
        .eq('id', device.id);

      if (error) throw error;

      // Clear localStorage if this was the local credential
      const storedCred = localStorage.getItem('webauthn_credential_id');
      if (storedCred === device.credential_id) {
        localStorage.removeItem('webauthn_credential_id');
        localStorage.removeItem('webauthn_setup_dismissed');
      }

      toast({ title: 'Apparaat verwijderd', description: `${device.device_name} is verwijderd.` });
      queryClient.invalidateQueries({ queryKey: ['webauthn-devices'] });
    } catch {
      toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const isActive = devices.length > 0;

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/50">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-success/15' : 'bg-muted'}`}>
          <Fingerprint className={`h-5 w-5 ${isActive ? 'text-success' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">Biometrische login</p>
          <p className="text-xs text-muted-foreground">
            {isActive ? `${devices.length} apparaat${devices.length > 1 ? 'en' : ''} geregistreerd` : 'Niet ingesteld'}
          </p>
        </div>
        <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-success/15 text-success border-success/30' : ''}>
          {isActive ? 'Actief' : 'Inactief'}
        </Badge>
      </div>

      {/* Device list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : devices.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Geregistreerde apparaten</h3>
          {devices.map((device) => (
            <Card key={device.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{device.device_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Geregistreerd {format(new Date(device.created_at), 'd MMM yyyy', { locale: nl })}
                      {device.sign_count > 0 && ` · ${device.sign_count}× gebruikt`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(device)}
                    disabled={deletingId === device.id}
                    aria-label={`Verwijder ${device.device_name}`}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {deletingId === device.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 space-y-2">
          <Fingerprint className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Geen apparaten geregistreerd</p>
          <p className="text-xs text-muted-foreground/70">Registreer dit apparaat om snel in te loggen met Face ID of Touch ID</p>
        </div>
      )}

      {/* Register button */}
      {isSupported ? (
        <Button onClick={handleRegister} loading={loading} className="w-full" size="touch">
          <Plus className="h-4 w-4 mr-2" />
          Dit apparaat registreren
        </Button>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
          <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">Dit apparaat ondersteunt geen biometrische login</p>
        </div>
      )}
    </div>
  );
}
