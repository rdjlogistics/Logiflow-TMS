import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateDriverPortalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  driverName: string;
  driverEmail?: string | null;
  onSuccess?: () => void;
}

export function CreateDriverPortalDialog({
  open,
  onOpenChange,
  driverId,
  driverName,
  driverEmail,
  onSuccess,
}: CreateDriverPortalDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(driverEmail || '');
      setSendEmail(true);
    }
  }, [open, driverEmail]);

  const handleSubmit = async () => {
    if (!email) {
      toast({ title: 'Fout', description: 'Vul een e-mailadres in.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-driver-portal-account', {
        body: { driverId, email, sendEmail },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Portaalaccount aangemaakt',
        description: sendEmail
          ? `Uitnodigingslink verstuurd naar ${email}`
          : 'Account aangemaakt. De chauffeur kan inloggen via het portaal.',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Create portal account error:', err);
      toast({
        title: 'Fout',
        description: err.message || 'Kon portaalaccount niet aanmaken.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Portaalaccount aanmaken
          </DialogTitle>
          <DialogDescription>
            Maak een inlogaccount aan voor <strong>{driverName}</strong> voor het chauffeursportaal.
            De chauffeur ontvangt een eenmalige inloglink per e-mail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="portal-email">E-mailadres</Label>
            <Input
              id="portal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="chauffeur@voorbeeld.nl"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Verstuur uitnodiging per e-mail</p>
              <p className="text-xs text-muted-foreground">Stuur een beveiligde inloglink naar de chauffeur</p>
            </div>
            <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !email}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Bezig...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Account aanmaken
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
