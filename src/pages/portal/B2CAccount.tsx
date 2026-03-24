import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationPreferences } from "@/hooks/usePortalAuth";
import B2CLayout from "@/components/portal/b2c/B2CLayout";
import { 
  User, 
  Bell, 
  FileText, 
  ChevronRight,
  LogOut,
  Shield,
  CreditCard,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { B2CProfileSheet } from "@/components/portal/b2c/B2CProfileSheet";
import { B2CSecuritySheet } from "@/components/portal/b2c/B2CSecuritySheet";
import { B2CPaymentSheet } from "@/components/portal/b2c/B2CPaymentSheet";
import { B2CInvoicesSheet } from "@/components/portal/b2c/B2CInvoicesSheet";

const B2CAccount = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { preferences, loading, saving, updatePreference } = useNotificationPreferences();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  const menuItems = [
    { icon: User, label: "Mijn gegevens", action: () => setProfileOpen(true) },
    { icon: FileText, label: "Facturen", action: () => setInvoicesOpen(true) },
    { icon: CreditCard, label: "Betaalmethodes", action: () => setPaymentOpen(true) },
    { icon: Shield, label: "Privacy & Beveiliging", action: () => setSecurityOpen(true) },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/demo");
  };

  const handleNotificationChange = async (key: 'pushEnabled' | 'smsEnabled' | 'emailShipmentUpdates', value: boolean) => {
    updatePreference(key, value);
    toast.success("Voorkeuren opgeslagen");
  };

  return (
    <B2CLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Account</h1>
          <p className="text-sm text-muted-foreground">Beheer je profiel en voorkeuren</p>
        </div>

        {/* Profile Card */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold to-gold-muted flex items-center justify-center">
                <User className="h-7 w-7 text-gold-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{user?.email?.split('@')[0] || 'Klant'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <Card 
              key={item.label}
              className="border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={item.action}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="flex-1 font-medium text-sm">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Sheets */}
        <B2CProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
        <B2CInvoicesSheet open={invoicesOpen} onOpenChange={setInvoicesOpen} />
        <B2CPaymentSheet open={paymentOpen} onOpenChange={setPaymentOpen} />
        <B2CSecuritySheet open={securityOpen} onOpenChange={setSecurityOpen} />

        {/* Notifications */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificaties
            {(loading || saving) && <Loader2 className="h-3 w-3 animate-spin" />}
          </h2>
          
          <Card className="border-border/50">
            <CardContent className="p-0 divide-y divide-border/50">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">E-mail updates</p>
                  <p className="text-xs text-muted-foreground">Ontvang statusupdates per e-mail</p>
                </div>
                <Switch 
                  checked={preferences.emailShipmentUpdates}
                  onCheckedChange={(checked) => handleNotificationChange('emailShipmentUpdates', checked)}
                  disabled={loading || saving}
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">Push notificaties</p>
                  <p className="text-xs text-muted-foreground">Meldingen op je telefoon</p>
                </div>
                <Switch 
                  checked={preferences.pushEnabled}
                  onCheckedChange={(checked) => handleNotificationChange('pushEnabled', checked)}
                  disabled={loading || saving}
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">SMS berichten</p>
                  <p className="text-xs text-muted-foreground">Alleen bij bezorging</p>
                </div>
                <Switch 
                  checked={preferences.smsEnabled}
                  onCheckedChange={(checked) => handleNotificationChange('smsEnabled', checked)}
                  disabled={loading || saving}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Uitloggen
        </Button>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground">
          LogiFlow v2.0 • © 2024
        </p>
      </div>
    </B2CLayout>
  );
};

export default B2CAccount;
