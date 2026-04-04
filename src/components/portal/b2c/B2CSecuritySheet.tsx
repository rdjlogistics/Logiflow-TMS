import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Shield, Key, Smartphone, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface B2CSecuritySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const B2CSecuritySheet = ({ open, onOpenChange }: B2CSecuritySheetProps) => {
  const { signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Wachtwoorden komen niet overeen");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error("Wachtwoord moet minimaal 8 tekens zijn");
      return;
    }
    
    setSaving(true);
    
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword
    });
    
    setSaving(false);
    
    if (error) {
      toast.error(`Fout bij wijzigen wachtwoord: ${error.message}`);
    } else {
      toast.success("Wachtwoord succesvol gewijzigd");
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  const [enrolling2FA, setEnrolling2FA] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);

  const handleToggle2FA = async (enabled: boolean) => {
    if (enabled) {
      setEnrolling2FA(true);
      try {
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
        if (error) throw error;
        if (data) {
          setFactorId(data.id);
          setQrCode(data.totp.qr_code);
        }
      } catch (err: any) {
        toast.error(`2FA activeren mislukt: ${err.message}`);
        setEnrolling2FA(false);
      }
    } else {
      // Unenroll
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.[0];
        if (totpFactor) {
          await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
          setTwoFAEnabled(false);
          toast.success("2FA uitgeschakeld");
        }
      } catch (err: any) {
        toast.error(`2FA uitschakelen mislukt: ${err.message}`);
      }
    }
  };

  const handleVerify2FA = async () => {
    if (!factorId || !verifyCode) return;
    setSaving(true);
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw challengeErr;
      
      const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code: verifyCode });
      if (verifyErr) throw verifyErr;
      
      setTwoFAEnabled(true);
      setEnrolling2FA(false);
      setQrCode(null);
      setVerifyCode('');
      setFactorId(null);
      toast.success("2FA succesvol geactiveerd!");
    } catch (err: any) {
      toast.error(`Verificatie mislukt: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOutAllSessions = async () => {
    setSigningOut(true);
    
    try {
      // Sign out from all sessions globally
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        toast.error(`Fout bij uitloggen: ${error.message}`);
      } else {
        toast.success("Alle sessies zijn uitgelogd. U wordt nu doorgestuurd naar de inlogpagina.");
        // The auth state listener will handle the redirect
      }
    } catch (err) {
      toast.error("Er is een fout opgetreden");
    } finally {
      setSigningOut(false);
      setShowSignOutDialog(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>Privacy & Beveiliging</SheetTitle>
            <SheetDescription>Beheer je accountbeveiliging</SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-120px)]">
            {/* Password Section */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Wachtwoord</p>
                    <p className="text-xs text-muted-foreground">Wijzig je wachtwoord</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                  >
                    Wijzigen
                  </Button>
                </div>
                
                {showPasswordForm && (
                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nieuw wachtwoord</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Minimaal 8 tekens"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="Herhaal nieuw wachtwoord"
                      />
                    </div>
                    <Button 
                      onClick={handleChangePassword} 
                      disabled={saving || !passwordData.newPassword || !passwordData.confirmPassword} 
                      className="w-full"
                    >
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Wachtwoord wijzigen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* 2FA Section */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Twee-factor authenticatie</p>
                    <p className="text-xs text-muted-foreground">Extra beveiliging via authenticator app</p>
                  </div>
                  <Switch 
                    checked={twoFAEnabled}
                    onCheckedChange={handleToggle2FA}
                    disabled={enrolling2FA}
                  />
                </div>
                {enrolling2FA && qrCode && (
                  <div className="mt-4 pt-3 border-t border-border/50 space-y-3">
                    <p className="text-xs text-muted-foreground">Scan de QR-code met je authenticator app (bijv. Google Authenticator):</p>
                    <div className="flex justify-center">
                      <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verifyCode">Verificatiecode</Label>
                      <Input
                        id="verifyCode"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        placeholder="6-cijferige code"
                        maxLength={6}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEnrolling2FA(false); setQrCode(null); setFactorId(null); >
                        Annuleren
                      </Button>
                      <Button size="sm" className="flex-1" onClick={handleVerify2FA} disabled={saving || verifyCode.length < 6}>
                        {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Activeren
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Session Info */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Actieve sessies</p>
                    <p className="text-xs text-muted-foreground">Log uit op alle apparaten</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowSignOutDialog(true)}
                  >
                    Uitloggen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Alle sessies uitloggen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Je wordt uitgelogd op alle apparaten, inclusief dit apparaat. 
              Je moet opnieuw inloggen om verder te gaan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSignOutAllSessions}
              disabled={signingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {signingOut && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ja, log overal uit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};