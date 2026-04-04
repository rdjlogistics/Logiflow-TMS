import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RouteplanningTab } from '@/components/settings/RouteplanningTab';
import { PlanningSettingsTab } from '@/components/settings/PlanningSettingsTab';
import { ThemePresetsTab } from '@/components/settings/ThemePresetsTab';
import { DriverAppSettingsTab } from '@/components/settings/DriverAppSettingsTab';
import { OrderSubstatusesTab } from '@/components/settings/OrderSubstatusesTab';
import { EmailDomainTab } from '@/components/settings/EmailDomainTab';
import { SubscriptionTab } from '@/components/settings/SubscriptionTab';
import { UserRolesTab } from '@/components/settings/UserRolesTab';
import { UpgradePricingTab } from '@/components/settings/UpgradePricingTab';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import {
  Settings,
  Truck,
  Mail,
  Euro,
  Save,
  Plus,
  X,
  Loader2,
  ShieldAlert,
  Building2,
  Upload,
  Image,
  Bot,
  Zap,
  Users,
  CreditCard,
  Globe,
  Bell,
  Palette,
  Route,
  FileText,
  Smartphone,
  Tag,
  Send,
  Calendar,
} from 'lucide-react';

interface TenantSettings {
  id: string;
  company_id: string | null;
  show_purchase_price_to_driver: boolean;
  auto_send_pod_email: boolean;
  pod_email_recipients: string[];
  company_name: string | null;
  company_address: string | null;
  company_postal_code: string | null;
  company_city: string | null;
  company_country: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_vat_number: string | null;
  company_kvk_number: string | null;
  company_logo_url: string | null;
  company_iban: string | null;
  company_bic: string | null;
  route_service_time_minutes: number;
  route_eta_margin_before_minutes: number;
  route_eta_margin_after_minutes: number;
  route_start_location: string;
  route_end_location: string;
  route_vehicle_type: string;
  route_optimization_provider: string;
  route_speed_percentage: number;
  composite_route_product_id: string | null;
  show_documents_in_driver_app: boolean;
  attach_documents_to_invoice: boolean;
  attach_documents_to_purchase_invoice: boolean;
}

interface ChatGPTSettings {
  id: string;
  monthly_budget_usd: number | null;
  hard_cap_usd: number | null;
  rate_limit_per_minute: number | null;
  max_tokens_per_request: number | null;
  chauffeur_access_enabled: boolean | null;
  klant_access_enabled: boolean | null;
}

const tabs = [
  { value: 'abonnement', icon: CreditCard, label: 'Abonnement', desc: 'Plan & limieten' },
  { value: 'gebruikers', icon: Users, label: 'Gebruikers', desc: 'Rollen & toegang' },
  { value: 'upgrade', icon: Zap, label: 'Upgrade', desc: 'Pakketten & prijzen' },
  { value: 'bedrijf', icon: Building2, label: 'Bedrijf', desc: 'Branding & gegevens' },
  { value: 'thema', icon: Palette, label: 'Thema', desc: 'Stijl & sjablonen' },
  { value: 'chauffeurs', icon: Truck, label: 'Chauffeurs', desc: 'Portal & documenten' },
  { value: 'chauffeurs-app', icon: Smartphone, label: 'Chauffeurs App', desc: 'App-instellingen' },
  { value: 'substatussen', icon: Tag, label: 'Substatussen', desc: 'Order substatussen' },
  { value: 'planning', icon: Calendar, label: 'Planning', desc: 'Auto-approve & boetes' },
  { value: 'notificaties', icon: Bell, label: 'Notificaties', desc: 'E-mail & POD' },
  { value: 'integraties', icon: Zap, label: 'Integraties', desc: 'AI & koppelingen' },
  { value: 'routeplanning', icon: Route, label: 'Routeplanning', desc: 'Routes & providers' },
  { value: 'email', icon: Send, label: 'E-mail', desc: 'Afzenderdomein' },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const AdminSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [chatGPTSettings, setChatGPTSettings] = useState<ChatGPTSettings | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    tabParam && tabs.some(t => t.value === tabParam) ? tabParam : 'abonnement'
  );

  // Sync with URL param changes
  useEffect(() => {
    if (tabParam && tabs.some(t => t.value === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Check admin access
  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      toast({
        title: 'Geen toegang',
        description: 'Je hebt geen admin rechten om deze pagina te bekijken.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [role, roleLoading, navigate, toast]);

  // Fetch settings — pre-fill company_* fields from companies table
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let companyId: string | null = null;
        if (user) {
          const { data: uc } = await supabase
            .from('user_companies')
            .select('company_id')
            .eq('user_id', user.id)
            .eq('is_primary', true)
            .maybeSingle();
          companyId = uc?.company_id ?? null;
        }

        // Fetch companies record for pre-fill
        let companyRecord: Record<string, any> | null = null;
        if (companyId) {
          const { data: compData } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .maybeSingle();
          companyRecord = compData;
        }

        const { data: tenantData, error: tenantError } = await supabase
          .from('tenant_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (tenantError) throw tenantError;

        if (tenantData) {
          // Pre-fill company_* fields from companies table when they are NULL in tenant_settings
          const merged = { ...tenantData } as any;
          if (companyRecord) {
            const fieldMap: Record<string, string> = {
              company_name: 'name',
              company_email: 'email',
              company_phone: 'phone',
              company_address: 'address',
              company_postal_code: 'postal_code',
              company_city: 'city',
              company_country: 'country',
              company_kvk_number: 'kvk_number',
              company_vat_number: 'vat_number',
              company_iban: 'iban',
              company_bic: 'bic',
              company_logo_url: 'logo_url',
            };
            for (const [tsKey, compKey] of Object.entries(fieldMap)) {
              if (!merged[tsKey] && companyRecord[compKey]) {
                merged[tsKey] = companyRecord[compKey];
              }
            }
          }
          setSettings(merged);
        } else if (companyId) {
          const { data: newSettings, error: insertError } = await supabase
            .from('tenant_settings')
            .insert({
              company_id: companyId,
              show_purchase_price_to_driver: false,
              auto_send_pod_email: true,
              pod_email_recipients: [],
            })
            .select()
            .single();

          if (insertError) throw insertError;
          // Pre-fill from companies for new tenant_settings too
          const merged = { ...newSettings } as any;
          if (companyRecord) {
            if (!merged.company_name && companyRecord.name) merged.company_name = companyRecord.name;
            if (!merged.company_logo_url && companyRecord.logo_url) merged.company_logo_url = companyRecord.logo_url;
          }
          setSettings(merged);
        }

        const { data: chatData, error: chatError } = await supabase
          .from('chatgpt_tenant_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (!chatError && chatData) {
          setChatGPTSettings(chatData);
        } else if (companyId) {
          const { data: newChatSettings, error: insertChatError } = await supabase
            .from('chatgpt_tenant_settings')
            .insert({
              company_id: companyId,
              monthly_budget_usd: 50,
              hard_cap_usd: 100,
              rate_limit_per_minute: 20,
              max_tokens_per_request: 4000,
              chauffeur_access_enabled: false,
              klant_access_enabled: false,
            })
            .select()
            .single();

          if (!insertChatError && newChatSettings) {
            setChatGPTSettings(newChatSettings);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast({
          title: 'Fout',
          description: 'Kon instellingen niet laden.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (role === 'admin') {
      fetchSettings();
    }
  }, [role, toast]);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error: tenantError } = await supabase
        .from('tenant_settings')
        .update({
          show_purchase_price_to_driver: settings.show_purchase_price_to_driver,
          auto_send_pod_email: settings.auto_send_pod_email,
          pod_email_recipients: settings.pod_email_recipients,
          company_name: settings.company_name,
          company_address: settings.company_address,
          company_postal_code: settings.company_postal_code,
          company_city: settings.company_city,
          company_country: settings.company_country,
          company_phone: settings.company_phone,
          company_email: settings.company_email,
          company_vat_number: settings.company_vat_number,
          company_kvk_number: settings.company_kvk_number,
          company_logo_url: settings.company_logo_url,
          company_iban: settings.company_iban,
          company_bic: settings.company_bic,
          route_service_time_minutes: settings.route_service_time_minutes,
          route_eta_margin_before_minutes: settings.route_eta_margin_before_minutes,
          route_eta_margin_after_minutes: settings.route_eta_margin_after_minutes,
          route_start_location: settings.route_start_location,
          route_end_location: settings.route_end_location,
          route_vehicle_type: settings.route_vehicle_type,
          route_optimization_provider: settings.route_optimization_provider,
          route_speed_percentage: settings.route_speed_percentage,
          composite_route_product_id: settings.composite_route_product_id,
          show_documents_in_driver_app: settings.show_documents_in_driver_app,
          attach_documents_to_invoice: settings.attach_documents_to_invoice,
          attach_documents_to_purchase_invoice: settings.attach_documents_to_purchase_invoice,
          driver_app_use_arrival_departure_times: (settings as any).driver_app_use_arrival_departure_times ?? false,
          driver_app_separate_remarks_field: (settings as any).driver_app_separate_remarks_field ?? true,
          driver_app_auto_save_waiting: (settings as any).driver_app_auto_save_waiting ?? false,
          driver_app_auto_save_loading: (settings as any).driver_app_auto_save_loading ?? false,
          driver_app_auto_save_distance: (settings as any).driver_app_auto_save_distance ?? false,
          driver_app_show_waybill: (settings as any).driver_app_show_waybill ?? false,
          driver_app_show_cmr: (settings as any).driver_app_show_cmr ?? false,
          driver_app_completed_stops_bottom: (settings as any).driver_app_completed_stops_bottom ?? false,
          default_delivery_confirmation_enabled: (settings as any).default_delivery_confirmation_enabled ?? true,
          default_delivery_confirmation_per_stop: (settings as any).default_delivery_confirmation_per_stop ?? false,
        } as any)
        .eq('id', settings.id);

      if (tenantError) throw tenantError;

      // Dual-write: sync company_* fields to companies table
      if (settings.company_id) {
        const { error: companyError } = await supabase
          .from('companies')
          .update({
            name: settings.company_name || undefined,
            email: settings.company_email,
            phone: settings.company_phone,
            address: settings.company_address,
            postal_code: settings.company_postal_code,
            city: settings.company_city,
            country: settings.company_country,
            kvk_number: settings.company_kvk_number,
            vat_number: settings.company_vat_number,
            iban: settings.company_iban,
            bic: settings.company_bic,
            logo_url: settings.company_logo_url,
          } as any)
          .eq('id', settings.company_id);

        if (companyError) {
          console.error('Error syncing to companies:', companyError);
        }
      }

      if (chatGPTSettings) {
        const { error: chatError } = await supabase
          .from('chatgpt_tenant_settings')
          .update({
            monthly_budget_usd: chatGPTSettings.monthly_budget_usd,
            hard_cap_usd: chatGPTSettings.hard_cap_usd,
            rate_limit_per_minute: chatGPTSettings.rate_limit_per_minute,
            max_tokens_per_request: chatGPTSettings.max_tokens_per_request,
            chauffeur_access_enabled: chatGPTSettings.chauffeur_access_enabled,
            klant_access_enabled: chatGPTSettings.klant_access_enabled,
          })
          .eq('id', chatGPTSettings.id);

        if (chatError) throw chatError;
      }

      toast({
        title: 'Opgeslagen',
        description: 'Alle instellingen zijn bijgewerkt.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Fout',
        description: 'Kon instellingen niet opslaan.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !settings) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Ongeldig bestandstype', description: 'Upload een afbeelding (PNG, JPG, etc.)', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Bestand te groot', description: 'Maximale bestandsgrootte is 2MB', variant: 'destructive' });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${settings.id}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      setSettings({ ...settings, company_logo_url: urlData.publicUrl });

      // Sync logo to companies table immediately
      if (settings.company_id) {
        await supabase
          .from('companies')
          .update({ logo_url: urlData.publicUrl } as any)
          .eq('id', settings.company_id);
      }

      toast({ title: 'Logo geüpload', description: 'Logo is succesvol geüpload en opgeslagen.' });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({ title: 'Fout', description: 'Kon logo niet uploaden.', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (!settings) return;
    try {
      const { error } = await supabase
        .from('tenant_settings')
        .update({ company_logo_url: null } as any)
        .eq('id', settings.id);
      if (error) throw error;
      if (settings.company_id) {
        await supabase
          .from('companies')
          .update({ logo_url: null } as any)
          .eq('id', settings.company_id);
      }
      setSettings({ ...settings, company_logo_url: null });
      toast({ title: 'Logo verwijderd', description: 'Het logo is verwijderd.' });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({ title: 'Fout', description: 'Kon logo niet verwijderen.', variant: 'destructive' });
    }
  };

  const addEmailRecipient = () => {
    if (!newEmail || !settings) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({ title: 'Ongeldig e-mailadres', description: 'Voer een geldig e-mailadres in.', variant: 'destructive' });
      return;
    }
    if (settings.pod_email_recipients.includes(newEmail)) {
      toast({ title: 'E-mail bestaat al', description: 'Dit e-mailadres staat al in de lijst.', variant: 'destructive' });
      return;
    }
    setSettings({ ...settings, pod_email_recipients: [...settings.pod_email_recipients, newEmail] });
    setNewEmail('');
  };

  const removeEmailRecipient = (email: string) => {
    if (!settings) return;
    setSettings({ ...settings, pod_email_recipients: settings.pod_email_recipients.filter(e => e !== email) });
  };

  if (roleLoading || loading) {
    return (
      <DashboardLayout title="Instellingen">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (role !== 'admin') {
    return (
      <DashboardLayout title="Instellingen">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold">Geen toegang</h2>
          <p className="text-muted-foreground">Je hebt admin rechten nodig om deze pagina te bekijken.</p>
        </div>
      </DashboardLayout>
    );
  }

  const activeTabObj = tabs.find(t => t.value === activeTab);

  // Reusable glass toggle row
  const GlassToggleRow = ({ icon: Icon, label, description, checked, onCheckedChange, disabled = false }: {
    icon: React.ElementType; label: string; description: string; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean;
  }) => (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-xl",
        "bg-card/40 backdrop-blur-sm border border-border/30",
        "hover:bg-card/60 transition-colors min-h-[52px]",
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
    <DashboardLayout title="Instellingen" description="Beheer bedrijfsinstellingen en configuraties">
      <div className="space-y-4 md:space-y-0">
        {/* Header — desktop: inline save, mobile: title only */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5">
              <div 
                className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20"
              >
                <Settings className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
              </div>
              <span>Instellingen</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm hidden sm:block">
              Beheer bedrijfsinstellingen, integraties en toegangsrechten
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="btn-premium hidden md:flex">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Opslaan
          </Button>
        </div>

        {settings && (
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* === SIDEBAR (Desktop/Tablet) === */}
            <nav className="hidden md:block w-[220px] lg:w-[250px] shrink-0 sticky top-20 self-start">
              <div className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl p-2 space-y-0.5 shadow-lg shadow-black/5">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.value;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {isActive && (
                        <div
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/25"
                        />
                      )}
                      <span className="relative flex items-center gap-3">
                        <TabIcon className="h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium block leading-tight">{tab.label}</span>
                          <span className={cn("text-[11px] leading-tight block", isActive ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                            {tab.desc}
                          </span>
                        </div>
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* === HORIZONTAL SCROLL TABS (Mobile) === */}
            <div className="md:hidden sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/80 backdrop-blur-xl border-b border-border/20">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mb-1">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.value;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        "relative flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap snap-start shrink-0 transition-colors",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground bg-muted/40"
                      )}
                    >
                      {isActive && (
                        <div
                          className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25"
                        />
                      )}
                      <span className="relative flex items-center gap-1.5">
                        <TabIcon className="h-3.5 w-3.5" />
                        <span>{tab.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* === CONTENT AREA === */}
            <div className="flex-1 min-w-0">
                <div
                  key={activeTab}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                  className="space-y-4 md:space-y-6"
                >
                  {/* === ABONNEMENT === */}
                  {activeTab === 'abonnement' && <SubscriptionTab />}

                  {/* === GEBRUIKERS === */}
                  {activeTab === 'gebruikers' && <UserRolesTab />}

                  {/* === UPGRADE === */}
                  {activeTab === 'upgrade' && <UpgradePricingTab />}

                  {/* === BEDRIJF === */}
                  {activeTab === 'bedrijf' && (
                    <>
                      <div>
                        <Card variant="glass">
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Palette className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base md:text-lg">Huisstijl & Branding</CardTitle>
                                <CardDescription>Logo en visuele identiteit voor documenten</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                              {settings.company_logo_url ? (
                                <div className="relative group">
                                  <div className="h-20 w-40 md:h-24 md:w-48 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center p-3 overflow-hidden">
                                    <img src={settings.company_logo_url} alt="Bedrijfslogo" className="max-h-full max-w-full object-contain" />
                                  </div>
                                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={removeLogo}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="h-20 w-40 md:h-24 md:w-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-muted/30 text-muted-foreground">
                                  <Image className="h-8 w-8 mb-1" />
                                  <span className="text-xs">Geen logo</span>
                                </div>
                              )}
                              <div className="flex flex-col gap-2">
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                                <Button variant="outline" onClick={() => document.getElementById('logo-upload')?.click()} disabled={uploadingLogo}>
                                  {uploadingLogo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                  {settings.company_logo_url ? 'Wijzig logo' : 'Upload logo'}
                                </Button>
                                <p className="text-xs text-muted-foreground">PNG, JPG of SVG • Max 2MB</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <Card variant="glass">
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base md:text-lg">Bedrijfsgegevens</CardTitle>
                                <CardDescription>Contactinformatie en adresgegevens</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="company-name">Bedrijfsnaam</Label>
                                <Input id="company-name" placeholder="Uw bedrijfsnaam" className="text-base md:text-sm text-base" value={settings.company_name || ''} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="company-email">E-mailadres</Label>
                                <Input id="company-email" type="email" placeholder="info@uwbedrijf.nl" className="text-base md:text-sm text-base" value={settings.company_email || ''} onChange={(e) => setSettings({ ...settings, company_email: e.target.value })} />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="company-phone">Telefoonnummer</Label>
                                <Input id="company-phone" placeholder="+31 20 123 4567" className="text-base md:text-sm text-base" value={settings.company_phone || ''} onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="company-address">Adres</Label>
                                <Input id="company-address" placeholder="Straatnaam 123" className="text-base md:text-sm text-base" value={settings.company_address || ''} onChange={(e) => setSettings({ ...settings, company_address: e.target.value })} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="company-postal">Postcode</Label>
                                <Input id="company-postal" placeholder="1234 AB" className="text-base md:text-sm text-base" value={settings.company_postal_code || ''} onChange={(e) => setSettings({ ...settings, company_postal_code: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="company-city">Plaats</Label>
                                <Input id="company-city" placeholder="Amsterdam" className="text-base md:text-sm text-base" value={settings.company_city || ''} onChange={(e) => setSettings({ ...settings, company_city: e.target.value })} />
                              </div>
                              <div className="space-y-2 col-span-2">
                                <Label htmlFor="company-country">Land</Label>
                                <Input id="company-country" placeholder="Nederland" className="text-base md:text-sm text-base" value={settings.company_country || ''} onChange={(e) => setSettings({ ...settings, company_country: e.target.value })} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <Card variant="glass">
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <CreditCard className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base md:text-lg">Juridisch & Bankgegevens</CardTitle>
                                <CardDescription>KvK, BTW en IBAN informatie voor facturen</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="company-kvk">KvK-nummer</Label>
                                <Input id="company-kvk" placeholder="12345678" className="text-base md:text-sm text-base" value={settings.company_kvk_number || ''} onChange={(e) => setSettings({ ...settings, company_kvk_number: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="company-vat">BTW-nummer</Label>
                                <Input id="company-vat" placeholder="NL123456789B01" className="text-base md:text-sm text-base" value={settings.company_vat_number || ''} onChange={(e) => setSettings({ ...settings, company_vat_number: e.target.value })} />
                              </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="company-iban">IBAN</Label>
                                <Input id="company-iban" placeholder="NL91 ABNA 0417 1643 00" className="text-base md:text-sm text-base" value={settings.company_iban || ''} onChange={(e) => setSettings({ ...settings, company_iban: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="company-bic">BIC / SWIFT</Label>
                                <Input id="company-bic" placeholder="ABNANL2A" className="text-base md:text-sm text-base" value={settings.company_bic || ''} onChange={(e) => setSettings({ ...settings, company_bic: e.target.value })} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* === THEMA === */}
                  {activeTab === 'thema' && (
                    <div>
                      <ThemePresetsTab />
                    </div>
                  )}

                  {/* === CHAUFFEURS === */}
                  {activeTab === 'chauffeurs' && (
                    <>
                      <div>
                        <Card variant="glass">
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Truck className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base md:text-lg">Chauffeur Portal</CardTitle>
                                <CardDescription>Configureer wat chauffeurs kunnen zien en doen</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <GlassToggleRow
                              icon={Euro}
                              label="Toon verdiensten"
                              description="Chauffeurs kunnen het inkooptarief per rit zien in hun portaal"
                              checked={settings.show_purchase_price_to_driver}
                              onCheckedChange={(checked) => setSettings({ ...settings, show_purchase_price_to_driver: checked })}
                            />
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <Card variant="glass">
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-accent" />
                              </div>
                              <div>
                                <CardTitle className="text-base md:text-lg">Documentopslag</CardTitle>
                                <CardDescription>Bepaal hoe documenten worden gedeeld en bijgevoegd</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <GlassToggleRow icon={FileText} label="Documenten tonen in Chauffeurs App" description="Openbare documenten zijn zichtbaar voor chauffeurs in hun portaal" checked={settings.show_documents_in_driver_app} onCheckedChange={(checked) => setSettings({ ...settings, show_documents_in_driver_app: checked })} />
                            <GlassToggleRow icon={FileText} label="Documenten bijvoegen bij facturen" description="Voeg openbare documenten automatisch bij als bijlage bij verkoopfacturen" checked={settings.attach_documents_to_invoice} onCheckedChange={(checked) => setSettings({ ...settings, attach_documents_to_invoice: checked })} />
                            <GlassToggleRow icon={FileText} label="Documenten bijvoegen bij inkoopfacturen" description="Voeg openbare documenten automatisch bij als bijlage bij inkoopfacturen" checked={settings.attach_documents_to_purchase_invoice} onCheckedChange={(checked) => setSettings({ ...settings, attach_documents_to_purchase_invoice: checked })} />
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <Card variant="glass">
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
                                <Euro className="h-5 w-5 text-accent" />
                              </div>
                              <div>
                                <CardTitle className="text-base md:text-lg">Tarieven & Producten</CardTitle>
                                <CardDescription>Beheer standaard tarieven en prijsmodellen</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Button variant="outline" onClick={() => navigate('/products')} className="w-full sm:w-auto">
                              <Globe className="h-4 w-4 mr-2" />
                              Ga naar Producten
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* === CHAUFFEURS APP === */}
                  {activeTab === 'chauffeurs-app' && (
                    <div>
                      <DriverAppSettingsTab
                        settings={{
                          driver_app_use_arrival_departure_times: (settings as any).driver_app_use_arrival_departure_times ?? false,
                          driver_app_separate_remarks_field: (settings as any).driver_app_separate_remarks_field ?? true,
                          driver_app_auto_save_waiting: (settings as any).driver_app_auto_save_waiting ?? false,
                          driver_app_auto_save_loading: (settings as any).driver_app_auto_save_loading ?? false,
                          driver_app_auto_save_distance: (settings as any).driver_app_auto_save_distance ?? false,
                          driver_app_show_waybill: (settings as any).driver_app_show_waybill ?? false,
                          driver_app_show_cmr: (settings as any).driver_app_show_cmr ?? false,
                          driver_app_completed_stops_bottom: (settings as any).driver_app_completed_stops_bottom ?? false,
                        }}
                        onSettingsChange={(updates) => setSettings({ ...settings, ...updates } as TenantSettings)}
                      />
                    </div>
                  )}

                  {/* === SUBSTATUSSEN === */}
                  {activeTab === 'substatussen' && (
                    <div>
                      <OrderSubstatusesTab />
                    </div>
                  )}

                  {/* === NOTIFICATIES === */}
                  {activeTab === 'notificaties' && (
                    <>
                      <div>
                        <Card variant="glass">
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Mail className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base md:text-lg">POD E-mail Notificaties</CardTitle>
                                <CardDescription>Automatische Proof of Delivery e-mails na afmelding</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <GlassToggleRow icon={Mail} label="Automatisch versturen" description="Verstuur POD e-mail wanneer een chauffeur een stop afmeldt" checked={settings.auto_send_pod_email} onCheckedChange={(checked) => setSettings({ ...settings, auto_send_pod_email: checked })} />

                            <Separator />

                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm md:text-base font-medium">Standaard Ontvangers</Label>
                                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                                  Deze e-mailadressen ontvangen altijd een kopie van POD e-mails
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <Input type="email" placeholder="nieuw@email.nl" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addEmailRecipient()} className="flex-1 text-base md:text-sm text-base" />
                                <Button variant="outline" onClick={addEmailRecipient} size="icon">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>

                              {settings.pod_email_recipients.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {settings.pod_email_recipients.map((email) => (
                                    <Badge key={email} variant="secondary" className="pl-3 pr-1 py-1.5 gap-1">
                                      <span className="text-xs">{email}</span>
                                      <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive/20 hover:text-destructive" onClick={() => removeEmailRecipient(email)}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground italic py-2">Geen standaard ontvangers geconfigureerd</div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <Card variant="glass">
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
                                <Send className="h-5 w-5 text-accent" />
                              </div>
                              <div>
                                <CardTitle className="text-base md:text-lg">Afleverbevestiging Defaults</CardTitle>
                                <CardDescription>Standaard instellingen voor afleverbevestigingen naar klanten</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <GlassToggleRow icon={Mail} label="Standaard afleverbevestiging aan" description="Nieuwe klanten krijgen standaard een afleverbevestiging per e-mail" checked={(settings as any).default_delivery_confirmation_enabled ?? true} onCheckedChange={(checked) => setSettings({ ...settings, default_delivery_confirmation_enabled: checked } as any)} />
                            <GlassToggleRow icon={Users} label="Standaard per bestemming" description="E-mail per afzonderlijke bestemming i.p.v. één e-mail per order" checked={(settings as any).default_delivery_confirmation_per_stop ?? false} onCheckedChange={(checked) => setSettings({ ...settings, default_delivery_confirmation_per_stop: checked } as any)} />
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* === INTEGRATIES === */}
                  {activeTab === 'integraties' && (
                    <>
                      <div>
                        <Card variant="glass">
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                                  <Bot className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <div>
                                  <CardTitle className="text-base md:text-lg">AI Assistent (ChatGPT)</CardTitle>
                                  <CardDescription>Budget, limieten en toegangsbeheer</CardDescription>
                                </div>
                              </div>
                              <Badge className="badge-gradient">Actief</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {chatGPTSettings && (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="monthly-budget">Maandbudget (USD)</Label>
                                    <div className="relative">
                                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input id="monthly-budget" type="number" className="pl-9 text-base md:text-sm" placeholder="50 text-base" value={chatGPTSettings.monthly_budget_usd || ''} onChange={(e) => setChatGPTSettings({ ...chatGPTSettings, monthly_budget_usd: parseFloat(e.target.value) || null })} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Waarschuwing bij overschrijding</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="hard-cap">Hard Cap (USD)</Label>
                                    <div className="relative">
                                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input id="hard-cap" type="number" className="pl-9 text-base md:text-sm" placeholder="100 text-base" value={chatGPTSettings.hard_cap_usd || ''} onChange={(e) => setChatGPTSettings({ ...chatGPTSettings, hard_cap_usd: parseFloat(e.target.value) || null })} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Gebruik wordt geblokkeerd</p>
                                  </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="rate-limit">Rate Limit (per minuut)</Label>
                                    <Input id="rate-limit" type="number" placeholder="20" className="text-base md:text-sm text-base" value={chatGPTSettings.rate_limit_per_minute || ''} onChange={(e) => setChatGPTSettings({ ...chatGPTSettings, rate_limit_per_minute: parseInt(e.target.value) || null })} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="max-tokens">Max Tokens per Request</Label>
                                    <Input id="max-tokens" type="number" placeholder="4000" className="text-base md:text-sm text-base" value={chatGPTSettings.max_tokens_per_request || ''} onChange={(e) => setChatGPTSettings({ ...chatGPTSettings, max_tokens_per_request: parseInt(e.target.value) || null })} />
                                  </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                  <Label className="text-sm md:text-base font-medium">Toegangsbeheer</Label>
                                  <GlassToggleRow icon={Users} label="Chauffeurs" description="Toegang tot AI assistent in driver portal" checked={chatGPTSettings.chauffeur_access_enabled ?? false} onCheckedChange={(checked) => setChatGPTSettings({ ...chatGPTSettings, chauffeur_access_enabled: checked })} />
                                  <GlassToggleRow icon={Users} label="Klanten" description="Toegang tot AI assistent in klantportaal" checked={chatGPTSettings.klant_access_enabled ?? false} onCheckedChange={(checked) => setChatGPTSettings({ ...chatGPTSettings, klant_access_enabled: checked })} />
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <Card variant="glass" className="border-dashed">
                          <CardContent className="py-8">
                            <div className="flex flex-col items-center justify-center text-center">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                                <Zap className="h-5 w-5 text-primary" />
                              </div>
                              <h3 className="font-medium mb-1 text-sm md:text-base">Meer Integraties</h3>
                              <p className="text-xs md:text-sm text-muted-foreground max-w-md">
                                Toekomstige integraties met externe systemen zoals Mollie betalingen, track & trace providers en boekhoudsoftware.
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* === PLANNING === */}
                  {activeTab === 'planning' && (
                    <div>
                      <PlanningSettingsTab />
                    </div>
                  )}

                  {/* === ROUTEPLANNING === */}
                  {activeTab === 'routeplanning' && (
                    <div>
                      <RouteplanningTab
                        settings={{
                          route_service_time_minutes: settings.route_service_time_minutes ?? 15,
                          route_eta_margin_before_minutes: settings.route_eta_margin_before_minutes ?? 0,
                          route_eta_margin_after_minutes: settings.route_eta_margin_after_minutes ?? 0,
                          route_start_location: settings.route_start_location ?? 'first_stop',
                          route_end_location: settings.route_end_location ?? 'last_stop',
                          route_vehicle_type: settings.route_vehicle_type ?? 'truck',
                          route_optimization_provider: settings.route_optimization_provider ?? 'smartroute',
                          route_speed_percentage: settings.route_speed_percentage ?? 85,
                          composite_route_product_id: settings.composite_route_product_id ?? null,
                        }}
                        onSettingsChange={(updates) => setSettings({ ...settings, ...updates } as TenantSettings)}
                      />
                    </div>
                  )}

                  {/* === EMAIL === */}
                  {activeTab === 'email' && (
                    <div>
                      <EmailDomainTab />
                    </div>
                  )}
                </div>
            </div>
          </div>
        )}

        {/* === FLOATING SAVE BUTTON (Mobile) === */}
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-30">
          <div
          >
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 text-base font-semibold"
            >
              {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
              Opslaan
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
