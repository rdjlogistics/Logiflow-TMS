import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDriverContracts } from '@/hooks/useDriverContracts';
import { DriverContractsList } from '@/components/driver/DriverContractsList';
import { ContractSigningSheet } from '@/components/driver/ContractSigningSheet';
import { ExpensesSheet } from '@/components/driver/ExpensesSheet';
import { NotificationSettings } from '@/components/driver/NotificationSettings';
import { BiometricSettings } from '@/components/driver/BiometricSettings';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { DeleteAccountDialog } from '@/components/driver/DeleteAccountDialog';
import { DownloadDataDialog } from '@/components/driver/DownloadDataDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { 
  User, 
  FileText, 
  Bell, 
  HelpCircle,
  ChevronRight,
  LogOut,
  Shield,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  Fingerprint,
  Receipt,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { DriverContract } from '@/hooks/useDriverContracts';

interface DriverProfielTabProps {
  onLogout: () => void;
}

export function DriverProfielTab({ onLogout }: DriverProfielTabProps) {
  const { user } = useAuth();
  const { isSupported, hasCredential } = useWebAuthn();
  const {
    contracts,
    isLoading,
    refetch,
    signContract,
    declineContract,
    logViewEvent,
    isSigning,
    isDeclining,
    stats,
  } = useDriverContracts();

  const [showContracts, setShowContracts] = useState(false);
  const [selectedContract, setSelectedContract] = useState<DriverContract | null>(null);
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [showSupportSheet, setShowSupportSheet] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showDownloadDataDialog, setShowDownloadDataDialog] = useState(false);
  const [showSecuritySheet, setShowSecuritySheet] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailEnabled: true,
    remindersBefore: true,
  });

  // Privacy preferences state
  const [privacyPrefs, setPrivacyPrefs] = useState({
    locationSharing: true,
    profileVisible: false,
    analyticsEnabled: true,
  });

  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Load preferences from database
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('driver_preferences')
        .select('email_notifications, reminders_before_departure, location_sharing, profile_visible, analytics_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setNotificationPrefs({
          emailEnabled: data.email_notifications,
          remindersBefore: data.reminders_before_departure,
        });
        setPrivacyPrefs({
          locationSharing: data.location_sharing,
          profileVisible: data.profile_visible,
          analyticsEnabled: data.analytics_enabled,
        });
      }
      setPrefsLoaded(true);
    })();
  }, [user?.id]);

  // Save preferences to database
  const savePreferences = useCallback(async (notif: typeof notificationPrefs, privacy: typeof privacyPrefs) => {
    if (!user?.id) return;
    const payload = {
      user_id: user.id ?? '',
      email_notifications: notif.emailEnabled,
      reminders_before_departure: notif.remindersBefore,
      location_sharing: privacy.locationSharing,
      profile_visible: privacy.profileVisible,
      analytics_enabled: privacy.analyticsEnabled,
    };
    const { error } = await supabase
      .from('driver_preferences')
      .upsert(payload, { onConflict: 'user_id' });
    if (error) {
      toast({ title: "Fout", description: "Kon voorkeuren niet opslaan.", variant: "destructive" });
      return false;
    }
    toast({ title: "Opgeslagen", description: "Je voorkeuren zijn bijgewerkt." });
    return true;
  }, [user?.id]);

  // Handle delete account
  const handleDeleteAccount = async () => {
    // Soft delete - update profile with deleted_at timestamp
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: '[Verwijderd]' })
      .eq('user_id', user?.id ?? '');
    
    if (error) throw error;
    
    // Sign out user
    await supabase.auth.signOut();
    onLogout();
  };

  // Handle download data - real GDPR export
  const handleDownloadData = async (options: {
    includeProfile: boolean;
    includeTrips: boolean;
    includeDocuments: boolean;
    includeLocations: boolean;
  }) => {
    const data: Record<string, any> = {
      exportDate: new Date().toISOString(),
      userId: user?.id,
      email: user?.email,
    };

    const queries: (() => Promise<void>)[] = [];

    if (options.includeProfile) {
      queries.push(async () => {
        const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle();
        data.profile = profile;
      });
    }

    if (options.includeTrips) {
      queries.push(async () => {
        const { data: driver } = await supabase.from('drivers').select('id').eq('user_id', user!.id).maybeSingle();
        if (driver?.id) {
          const { data: trips } = await supabase
            .from('trips')
            .select('id, order_number, status, trip_date, pickup_address, pickup_city, delivery_address, delivery_city, route_stops(id, address, city, status, actual_arrival)')
            .eq('driver_id', driver.id)
            .order('trip_date', { ascending: false })
            .limit(50);
          data.trips = trips;
        }
      });
    }

    if (options.includeDocuments) {
      queries.push(async () => {
        const { data: docs } = await supabase.from('driver_documents')
          .select('id, document_type, file_name, file_url, verification_status, created_at, expiry_date')
          .eq('user_id', user!.id).limit(200);
        data.documents = docs;
      });
    }

    if (options.includeLocations) {
      queries.push(async () => {
        // driver_locations.driver_id stores auth.uid() (not drivers.id)
        const { data: locs } = await supabase.from('driver_locations')
          .select('latitude, longitude, speed, heading, recorded_at')
          .eq('driver_id', user!.id).order('recorded_at', { ascending: false }).limit(100);
        data.locationHistory = locs;
      });
    }

    await Promise.all(queries.map(fn => fn()));

    const jsonString = JSON.stringify(data, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  };

  const menuItems = [
    { icon: Receipt, label: 'Onkosten', onClick: () => setShowExpenses(true) },
    { icon: FileText, label: 'Documenten & Contracten', badge: stats.pending, onClick: () => setShowContracts(true) },
    { icon: Bell, label: 'Notificatie-instellingen', onClick: () => setShowNotificationsSheet(true) },
    { icon: Shield, label: 'Privacy', onClick: () => setShowPrivacySheet(true) },
    { icon: Fingerprint, label: 'Beveiliging & Biometrie', badge: (isSupported && !hasCredential) ? 1 : undefined, onClick: () => setShowSecuritySheet(true) },
    { icon: HelpCircle, label: 'Hulp & Support', onClick: () => setShowSupportSheet(true) },
  ];

  if (showContracts) {
    return (
      <>
        <DriverContractsList
          contracts={contracts}
          isLoading={isLoading}
          onRefresh={refetch}
          onContractClick={(contract) => setSelectedContract(contract)}
          onBack={() => setShowContracts(false)}
          stats={stats}
        />
        <ContractSigningSheet
          open={!!selectedContract}
          onOpenChange={() => setSelectedContract(null)}
          contract={selectedContract}
          onSign={signContract}
          onDecline={declineContract}
          onView={logViewEvent}
          isSigning={isSigning}
          isDeclining={isDeclining}
        />
      </>
    );
  }

  return (
    <>
    <ScrollArea className="flex-1 scroll-smooth-touch">
      <div className="px-4 pt-4 pb-32 space-y-4">
        {/* Profile Card */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <User className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">{user?.email?.split('@')[0] || 'Chauffeur'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <Card 
              key={item.label}
              className="border-border/50 cursor-pointer hover:bg-muted/30 transition-colors touch-feedback"
              onClick={item.onClick}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="flex-1 font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{item.badge}</span>
                    </div>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          onClick={onLogout}
          className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 touch-target"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Uitloggen
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-4">
          LogiFlow Driver v2.0
        </p>
      </div>
    </ScrollArea>

    {/* Notifications Sheet */}
    <Sheet open={showNotificationsSheet} onOpenChange={setShowNotificationsSheet}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificatie-instellingen
          </SheetTitle>
          <SheetDescription>
            Beheer hoe je meldingen ontvangt
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Real push notification settings */}
          <NotificationSettings />
          
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Extra voorkeuren</h3>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>E-mail notificaties</Label>
                <p className="text-xs text-muted-foreground">Ontvang samenvattingen per e-mail</p>
              </div>
              <Switch
                checked={notificationPrefs.emailEnabled}
                onCheckedChange={(checked) => setNotificationPrefs(prev => ({ ...prev, emailEnabled: checked }))}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label>Herinneringen voor vertrek</Label>
              <Switch
                checked={notificationPrefs.remindersBefore}
                onCheckedChange={(checked) => setNotificationPrefs(prev => ({ ...prev, remindersBefore: checked }))}
              />
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={async () => {
              const ok = await savePreferences(notificationPrefs, privacyPrefs);
              if (ok) setShowNotificationsSheet(false);
            }}
          >
            Opslaan
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    {/* Privacy Sheet */}
    <Sheet open={showPrivacySheet} onOpenChange={setShowPrivacySheet}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy-instellingen
          </SheetTitle>
          <SheetDescription>
            Beheer je privacy en gegevens
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Locatie delen</Label>
                <p className="text-xs text-muted-foreground">Deel je locatie tijdens actieve ritten</p>
              </div>
              <Switch
                checked={privacyPrefs.locationSharing}
                onCheckedChange={(checked) => setPrivacyPrefs(prev => ({ ...prev, locationSharing: checked }))}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Profiel zichtbaar</Label>
                <p className="text-xs text-muted-foreground">Laat collega's je profiel zien</p>
              </div>
              <Switch
                checked={privacyPrefs.profileVisible}
                onCheckedChange={(checked) => setPrivacyPrefs(prev => ({ ...prev, profileVisible: checked }))}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Analytics</Label>
                <p className="text-xs text-muted-foreground">Help ons de app te verbeteren</p>
              </div>
              <Switch
                checked={privacyPrefs.analyticsEnabled}
                onCheckedChange={(checked) => setPrivacyPrefs(prev => ({ ...prev, analyticsEnabled: checked }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => {
                setShowPrivacySheet(false);
                setTimeout(() => setShowDownloadDataDialog(true), 300);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Download mijn gegevens
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-destructive hover:text-destructive" 
              onClick={() => {
                setShowPrivacySheet(false);
                setTimeout(() => setShowDeleteAccountDialog(true), 300);
              }}
            >
              Verwijder mijn account
            </Button>
          </div>

          <Button 
            className="w-full" 
            onClick={async () => {
              const ok = await savePreferences(notificationPrefs, privacyPrefs);
              if (ok) setShowPrivacySheet(false);
            }}
          >
            Opslaan
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    {/* Support Sheet */}
    <Sheet open={showSupportSheet} onOpenChange={setShowSupportSheet}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Hulp & Support
          </SheetTitle>
          <SheetDescription>
            Heb je een vraag of probleem? Wij helpen je graag.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Card className="border-border/50 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => window.open('tel:+31201234567', '_self')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Bel planning</p>
                  <p className="text-sm text-muted-foreground">Direct contact met de planning</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => window.open('mailto:support@logiflow.nl', '_self')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">E-mail support</p>
                  <p className="text-sm text-muted-foreground">support@logiflow.nl</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-border/50 cursor-pointer hover:bg-muted/30 transition-colors" 
            onClick={() => {
              setShowSupportSheet(false);
              // Open WhatsApp with support number
              window.open('https://wa.me/31201234567?text=Hallo%2C%20ik%20heb%20een%20vraag', '_blank');
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">WhatsApp Support</p>
                  <p className="text-sm text-muted-foreground">Chat via WhatsApp met support</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <div className="pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Veelgestelde vragen</h3>
            <div className="space-y-2">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="font-medium text-sm">Hoe start ik een rit?</p>
                  <p className="text-xs text-muted-foreground mt-1">Ga naar het Ritten tabblad, selecteer een rit en druk op "Start rit".</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="font-medium text-sm">Wat als mijn GPS niet werkt?</p>
                  <p className="text-xs text-muted-foreground mt-1">Controleer of locatietoestemming is ingeschakeld in je telefooninstellingen.</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="font-medium text-sm">Hoe meld ik een probleem?</p>
                  <p className="text-xs text-muted-foreground mt-1">Bel of e-mail de planning met details over het probleem.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    {/* Security & Biometric Sheet */}
    <Sheet open={showSecuritySheet} onOpenChange={setShowSecuritySheet}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Beveiliging & Biometrie
          </SheetTitle>
          <SheetDescription>
            Beheer biometrische login voor snel en veilig inloggen
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <BiometricSettings />
        </div>
      </SheetContent>
    </Sheet>

    <DeleteAccountDialog
      open={showDeleteAccountDialog}
      onOpenChange={setShowDeleteAccountDialog}
      userEmail={user?.email || ''}
      onDelete={handleDeleteAccount}
    />

    {/* Download Data Dialog */}
    <DownloadDataDialog
      open={showDownloadDataDialog}
      onOpenChange={setShowDownloadDataDialog}
      userId={user?.id || ''}
      onDownload={handleDownloadData}
    />

    {/* Expenses Sheet */}
    <ExpensesSheet
      open={showExpenses}
      onOpenChange={setShowExpenses}
    />
  </>
  );
}
