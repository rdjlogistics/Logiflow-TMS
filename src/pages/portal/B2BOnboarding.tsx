import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Building2, Bell, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { title: "Bedrijfsgegevens", icon: Building2 },
  { title: "Notificaties", icon: Bell },
  { title: "Bevestiging", icon: CheckCircle2 },
];

export default function B2BOnboarding() {
  const navigate = useNavigate();
  const { user, customer, loading: authLoading } = usePortalAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Company details form
  const [companyData, setCompanyData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    postalCode: "",
    city: "",
    country: "NL",
    vatNumber: "",
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailShipmentUpdates: true,
    emailDeliveryConfirmation: true,
    emailInvoices: true,
    emailMarketing: false,
  });

  // Pre-fill from customer data
  useEffect(() => {
    if (customer) {
      setCompanyData({
        companyName: customer.companyName || "",
        contactName: customer.contactName || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        postalCode: customer.postalCode || "",
        city: customer.city || "",
        country: customer.country || "NL",
        vatNumber: customer.vatNumber || "",
      });
    }
  }, [customer]);

  const handleComplete = async () => {
    if (!user || !customer) return;
    setSaving(true);

    try {
      // 1. Update customer profile if changed
      const { error: custErr } = await supabase
        .from("customers")
        .update({
          company_name: companyData.companyName,
          contact_name: companyData.contactName,
          email: companyData.email,
          phone: companyData.phone,
          address: companyData.address,
          postal_code: companyData.postalCode,
          city: companyData.city,
          country: companyData.country,
          vat_number: companyData.vatNumber,
        })
        .eq("id", customer.id);

      if (custErr) throw custErr;

      // 2. Save notification preferences (upsert)
      const { error: notifErr } = await supabase
        .from("portal_notification_preferences")
        .upsert(
          {
            user_id: user.id,
            email_shipment_updates: notifications.emailShipmentUpdates,
            email_delivery_confirmation: notifications.emailDeliveryConfirmation,
            email_invoices: notifications.emailInvoices,
            email_marketing: notifications.emailMarketing,
            push_enabled: true,
            sms_enabled: false,
          },
          { onConflict: "user_id" }
        );

      if (notifErr) throw notifErr;

      toast.success("Welkom! Uw account is ingesteld.");
      navigate("/portal/b2b", { replace: true });
    } catch (err) {
      console.error("Onboarding error:", err);
      toast.error("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canProceedStep0 = companyData.companyName.trim().length > 0 && companyData.email.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`h-0.5 w-8 transition-colors ${isDone ? "bg-primary" : "bg-border"}`} />
                )}
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isDone
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  <span className="hidden sm:inline">{s.title}</span>
                </div>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Welkom bij het klantenportaal</CardTitle>
                  <CardDescription>
                    Controleer uw bedrijfsgegevens. U kunt deze later wijzigen in de instellingen.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Bedrijfsnaam *</Label>
                      <Input
                        id="companyName"
                        value={companyData.companyName}
                        onChange={(e) => setCompanyData((p) => ({ ...p, companyName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contactpersoon</Label>
                      <Input
                        id="contactName"
                        value={companyData.contactName}
                        onChange={(e) => setCompanyData((p) => ({ ...p, contactName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mailadres *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={companyData.email}
                        onChange={(e) => setCompanyData((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefoon</Label>
                      <Input
                        id="phone"
                        value={companyData.phone}
                        onChange={(e) => setCompanyData((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address">Adres</Label>
                      <Input
                        id="address"
                        value={companyData.address}
                        onChange={(e) => setCompanyData((p) => ({ ...p, address: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postcode</Label>
                      <Input
                        id="postalCode"
                        value={companyData.postalCode}
                        onChange={(e) => setCompanyData((p) => ({ ...p, postalCode: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Plaats</Label>
                      <Input
                        id="city"
                        value={companyData.city}
                        onChange={(e) => setCompanyData((p) => ({ ...p, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vatNumber">BTW-nummer</Label>
                      <Input
                        id="vatNumber"
                        value={companyData.vatNumber}
                        onChange={(e) => setCompanyData((p) => ({ ...p, vatNumber: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">E-mail notificaties</CardTitle>
                  <CardDescription>
                    Kies welke e-mails u wilt ontvangen. U kunt dit later altijd wijzigen.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    {
                      key: "emailShipmentUpdates" as const,
                      label: "Zending updates",
                      desc: "Ontvang updates wanneer de status van uw zending wijzigt",
                    },
                    {
                      key: "emailDeliveryConfirmation" as const,
                      label: "Bezorgbevestigingen",
                      desc: "E-mail wanneer uw zending is afgeleverd",
                    },
                    {
                      key: "emailInvoices" as const,
                      label: "Facturen",
                      desc: "Ontvang facturen per e-mail",
                    },
                    {
                      key: "emailMarketing" as const,
                      label: "Nieuws & aanbiedingen",
                      desc: "Blijf op de hoogte van nieuwe diensten en aanbiedingen",
                    },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifications[item.key]}
                        onCheckedChange={(val) =>
                          setNotifications((p) => ({ ...p, [item.key]: val }))
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Alles klaar!</CardTitle>
                  <CardDescription>
                    Controleer uw gegevens en klik op "Starten" om het portaal te gebruiken.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Bedrijf</p>
                      <p className="font-medium text-sm">{companyData.companyName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <p className="text-sm">{companyData.contactName || "—"} · {companyData.email}</p>
                    </div>
                    {companyData.address && (
                      <div>
                        <p className="text-xs text-muted-foreground">Adres</p>
                        <p className="text-sm">
                          {companyData.address}, {companyData.postalCode} {companyData.city}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Notificaties</p>
                    <div className="flex flex-wrap gap-2">
                      {notifications.emailShipmentUpdates && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Zending updates</span>
                      )}
                      {notifications.emailDeliveryConfirmation && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Bezorgbevestigingen</span>
                      )}
                      {notifications.emailInvoices && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Facturen</span>
                      )}
                      {notifications.emailMarketing && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Nieuws & aanbiedingen</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Vorige
          </Button>

          {step < 2 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !canProceedStep0}
              className="gap-1"
            >
              Volgende <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={saving} className="gap-1">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Starten
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
