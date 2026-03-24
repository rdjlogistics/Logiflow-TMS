import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface B2CProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProfileData {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export const B2CProfileSheet = ({ open, onOpenChange }: B2CProfileSheetProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
  });

  // Fetch profile data when sheet opens
  useEffect(() => {
    if (open && user?.id) {
      fetchProfile();
    }
  }, [open, user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        // Fallback to user metadata
        setFormData({
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          phone: user.user_metadata?.phone || '',
          address: user.user_metadata?.address || '',
          city: user.user_metadata?.city || '',
          postalCode: user.user_metadata?.postal_code || '',
        });
      } else if (data) {
        setFormData({
          fullName: data.full_name || user.user_metadata?.full_name || '',
          phone: data.phone || '',
          address: user.user_metadata?.address || '',
          city: user.user_metadata?.city || '',
          postalCode: user.user_metadata?.postal_code || '',
        });
      } else {
        // No profile found, use defaults
        setFormData({
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          phone: user.user_metadata?.phone || '',
          address: user.user_metadata?.address || '',
          city: user.user_metadata?.city || '',
          postalCode: user.user_metadata?.postal_code || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Je moet ingelogd zijn om je profiel op te slaan");
      return;
    }

    setSaving(true);
    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: formData.fullName,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.error('Profile update error:', profileError);
        toast.error("Kon profiel niet opslaan");
        return;
      }

      // Also update user metadata for address fields
      const { error: userError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
        }
      });

      if (userError) {
        console.error('User metadata update error:', userError);
        // Don't fail - profile was saved successfully
      }

      toast.success("Profiel opgeslagen");
      onOpenChange(false);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error("Er ging iets mis bij het opslaan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Mijn gegevens</SheetTitle>
          <SheetDescription>Beheer je persoonlijke informatie</SheetDescription>
        </SheetHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-160px)]">
              <div className="space-y-2">
                <Label htmlFor="fullName">Volledige naam</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Jan Jansen"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">E-mail kan niet worden gewijzigd</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefoonnummer</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+31 6 12345678"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Hoofdstraat 1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postcode</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="1234 AB"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Plaats</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Amsterdam"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Opslaan
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
