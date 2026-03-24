import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateCustomerPortalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  onSuccess?: () => void;
}

export function CreateCustomerPortalDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  customerEmail,
  onSuccess,
}: CreateCustomerPortalDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(customerEmail || '');
      setSendEmail(true);
    }
  }, [open, customerEmail]);

  const handleSubmit = async () => {
    if (!email) {
      toast({ title: 'Fout', description: 'Vul een e-mailadres in.', variant: 'destructive' });
      return;
    }

    // Check active session first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Sessie verlopen', description: 'Log opnieuw in en probeer het nogmaals.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-customer-portal-account', {
        body: { customerId, email, sendEmail },
      });

      // Parse FunctionsHttpError properly
      if (error) {
        let msg = 'Kon portaalaccount niet aanmaken.';
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
          else if (body?.message) msg = body.message;
        } catch { /* use default */ }
        if ((error as any).message) msg = (error as any).message;
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Portaalaccount aangemaakt',
        description: sendEmail
          ? `Uitnodigingslink verstuurd naar ${email}`
          : 'Account aangemaakt. De klant kan inloggen via het portaal.',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Create customer portal account error:', err);
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
            Klantenportaal account
          </DialogTitle>
          <DialogDescription>
            Maak een inlogaccount aan voor <strong>{customerName}</strong> voor het klantenportaal.
            De klant ontvangt een eenmalige inloglink per e-mail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customer-portal-email">E-mailadres</Label>
            <Input
              id="customer-portal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="klant@voorbeeld.nl"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Verstuur uitnodiging per e-mail</p>
              <p className="text-xs text-muted-foreground">Stuur een beveiligde inloglink naar de klant</p>
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
