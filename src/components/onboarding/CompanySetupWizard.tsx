import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Users, Truck, CheckCircle2,
  ChevronRight, ChevronLeft, Sparkles, Loader2,
  MapPin, Package, ArrowRight, Zap,
} from 'lucide-react';

const STORAGE_KEY = 'logiflow-onboarding-v2-done';

// ── New-user detection ────────────────────────────────────────────────────────
// Show only when:  localStorage flag not set  AND  company has no trips
export function useCompanySetupWizard() {
  // Check both old and new key — existing users never see it again
  const alreadyDone =
    typeof window !== 'undefined' &&
    (localStorage.getItem(STORAGE_KEY) || localStorage.getItem('logiflow-setup-wizard-done'));

  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(!!alreadyDone);
  const { company } = useCompany() as { company: { id: string; created_at?: string } | null };

  useEffect(() => {
    if (alreadyDone || checked) return;
    if (!company?.id) return;

    try {
      const createdAt = (company as any).created_at
        ? new Date((company as any).created_at)
        : null;
      const isNew = createdAt
        ? Date.now() - createdAt.getTime() < 72 * 60 * 60 * 1000
        : false;

      if (!isNew) {
        localStorage.setItem(STORAGE_KEY, 'true');
        setChecked(true);
        return;
      }

      Promise.resolve(
        supabase
          .from('trips')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
      ).then(({ count }) => {
          if ((count ?? 0) === 0) setShow(true);
          else localStorage.setItem(STORAGE_KEY, 'true');
          setChecked(true);
        })
        .catch(() => {
          // On error, don't show wizard
          localStorage.setItem(STORAGE_KEY, 'true');
          setChecked(true);
        });
    } catch {
      localStorage.setItem(STORAGE_KEY, 'true');
      setChecked(true);
    }
  }, [company?.id, checked, alreadyDone]);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  }, []);

  return { show, dismiss };
}

// ── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    label: 'Welkom',
    title: 'Welkom bij LogiFlow',
    subtitle: 'Jouw transport management systeem is klaar. Laten we het in 3 minuten instellen.',
    icon: Sparkles,
    color: 'from-violet-500 to-indigo-500',
    visual: '🚛',
  },
  {
    id: 'company',
    label: 'Bedrijf',
    title: 'Jouw bedrijf',
    subtitle: 'Vul je bedrijfsgegevens in. Dit verschijnt op facturen en documenten.',
    icon: Building2,
    color: 'from-blue-500 to-cyan-500',
    visual: '🏢',
  },
  {
    id: 'customer',
    label: 'Klant',
    title: 'Eerste klant',
    subtitle: 'Voeg je eerste opdrachtgever toe. Je kunt er later meer toevoegen.',
    icon: Users,
    color: 'from-emerald-500 to-teal-500',
    visual: '🤝',
  },
  {
    id: 'trip',
    label: 'Rit',
    title: 'Eerste rit',
    subtitle: 'Plan je eerste transport. Of sla over en doe het later.',
    icon: Truck,
    color: 'from-orange-500 to-amber-500',
    visual: '📍',
  },
  {
    id: 'done',
    label: 'Klaar',
    title: 'Je bent klaar!',
    subtitle: 'LogiFlow is ingesteld. Tijd om te rijden.',
    icon: CheckCircle2,
    color: 'from-emerald-500 to-green-400',
    visual: '🎉',
  },
] as const;

type StepId = typeof STEPS[number]['id'];

interface CompanySetupWizardProps {
  onComplete?: () => void;
}

export function CompanySetupWizard({ onComplete }: CompanySetupWizardProps) {
  const { company } = useCompany() as { company: { id: string } | null };
  const { toast } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    name: '', kvk_number: '', vat_number: '',
    address: '', postal_code: '', city: '', phone: '', iban: '',
  });
  const [customerForm, setCustomerForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '', city: '',
  });
  const [tripForm, setTripForm] = useState({
    trip_date: new Date().toISOString().split('T')[0],
    pickup_address: '', pickup_city: '',
    delivery_address: '', delivery_city: '',
    cargo_description: '',
  });

  const step = STEPS[stepIndex];
  const totalSteps = STEPS.length;

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete?.();
  }, [onComplete]);

  const goTo = useCallback((index: number) => {
    setDirection(index > stepIndex ? 1 : -1);
    setStepIndex(index);
  }, [stepIndex]);

  const handleNext = useCallback(async () => {
    if (step.id === 'welcome') { goTo(1); return; }
    if (step.id === 'done') { finish(); return; }

    if (step.id === 'company') {
      if (!company?.id) { goTo(stepIndex + 1); return; }
      setSaving(true);
      try {
        await supabase.from('companies').update({
          name: companyForm.name || undefined,
          kvk_number: companyForm.kvk_number || undefined,
          vat_number: companyForm.vat_number || undefined,
          address: companyForm.address || undefined,
          postal_code: companyForm.postal_code || undefined,
          city: companyForm.city || undefined,
          phone: companyForm.phone || undefined,
          iban: companyForm.iban || undefined,
        }).eq('id', company.id);
      } catch { /* silent */ }
      setSaving(false);
      goTo(stepIndex + 1);
      return;
    }

    if (step.id === 'customer') {
      if (customerForm.company_name.trim() && company?.id) {
        setSaving(true);
        try {
          await supabase.from('customers').insert({
            company_name: customerForm.company_name,
            contact_name: customerForm.contact_name || null,
            email: customerForm.email || null,
            phone: customerForm.phone || null,
            city: customerForm.city || null,
            tenant_id: company.id,
            is_active: true,
          });
          toast({ title: '✓ Klant aangemaakt' });
        } catch { /* silent */ }
        setSaving(false);
      }
      goTo(stepIndex + 1);
      return;
    }

    if (step.id === 'trip') {
      if (tripForm.pickup_address.trim() && tripForm.delivery_address.trim() && company?.id) {
        setSaving(true);
        try {
          await supabase.from('trips').insert({
            trip_date: tripForm.trip_date,
            pickup_address: tripForm.pickup_address,
            pickup_city: tripForm.pickup_city || null,
            delivery_address: tripForm.delivery_address,
            delivery_city: tripForm.delivery_city || null,
            cargo_description: tripForm.cargo_description || null,
            company_id: company.id,
            status: 'gepland',
          });
          toast({ title: '✓ Rit aangemaakt' });
        } catch { /* silent */ }
        setSaving(false);
      }
      goTo(stepIndex + 1);
      return;
    }
  }, [step.id, stepIndex, goTo, finish, company, companyForm, customerForm, tripForm, toast]);

  // ── Slide variants ────────────────────────────────────────────────────────
  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0 }),
  };

  const currentGradient = step.color;

  return (
    <div className="fixed inset-0 z-[300] flex items-stretch">
      {/* ── LEFT PANEL — branding ───────────────────────────────────────────── */}
      <motion.div
        className={`hidden lg:flex flex-col justify-between w-[42%] bg-gradient-to-br ${currentGradient} p-12 relative overflow-hidden`}
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-black/10 blur-2xl translate-y-1/2 -translate-x-1/2" />

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">LogiFlow</span>
          </div>
        </div>

        {/* Big visual */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.7, opacity: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="flex flex-col items-center justify-center gap-6"
          >
            <div className="text-[100px] leading-none select-none drop-shadow-2xl">
              {step.visual}
            </div>
            <div className="text-center">
              <h2 className="text-white font-bold text-3xl leading-tight">{step.title}</h2>
              <p className="text-white/70 mt-2 text-sm max-w-[260px] leading-relaxed">
                {step.subtitle}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Step dots */}
        <div className="flex items-center gap-2 relative">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.id}
              animate={{ width: i === stepIndex ? 28 : 8, opacity: i <= stepIndex ? 1 : 0.4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="h-2 rounded-full bg-white"
            />
          ))}
          <span className="ml-3 text-white/60 text-xs tabular-nums">
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>
      </motion.div>

      {/* ── RIGHT PANEL — form ──────────────────────────────────────────────── */}
      <motion.div
        className="flex-1 bg-background flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border/40">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <Truck className="h-5 w-5 text-primary" />
            <span className="font-bold text-base">LogiFlow</span>
          </div>
          {/* Progress bar */}
          <div className="hidden lg:flex items-center gap-3 flex-1">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${currentGradient}`}
                animate={{ width: `${((stepIndex) / (totalSteps - 1)) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
              {stepIndex + 1} / {totalSteps}
            </span>
          </div>
          {/* Skip button */}
          {step.id !== 'done' && step.id !== 'welcome' && (
            <button
              onClick={() => goTo(stepIndex + 1)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-6"
            >
              Stap overslaan →
            </button>
          )}
        </div>

        {/* Form area */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center px-8 py-10">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              >
                {/* Step header (mobile) */}
                <div className="mb-8 lg:hidden">
                  <div className="text-5xl mb-4">{step.visual}</div>
                  <h1 className="text-2xl font-bold">{step.title}</h1>
                  <p className="text-muted-foreground mt-1 text-sm">{step.subtitle}</p>
                </div>

                {/* Step header (desktop) */}
                <div className="mb-8 hidden lg:block">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-gradient-to-r ${currentGradient} text-white`}>
                    <step.icon className="h-3 w-3" />
                    Stap {stepIndex + 1}
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">{step.title}</h1>
                  <p className="text-muted-foreground mt-2">{step.subtitle}</p>
                </div>

                {/* ── STEP: WELCOME ────────────────────────────────────── */}
                {step.id === 'welcome' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Zap, label: 'Ritten plannen', desc: 'Van ophalen tot afleveren' },
                        { icon: Users, label: 'Klantenbeheer', desc: 'CRM en facturen' },
                        { icon: MapPin, label: 'Live tracking', desc: 'Chauffeurs & routes' },
                        { icon: Package, label: 'Facturen', desc: 'Automatisch genereren' },
                      ].map((f) => (
                        <div key={f.label} className="p-4 rounded-2xl border border-border/50 bg-muted/30">
                          <f.icon className="h-5 w-5 text-primary mb-2" />
                          <p className="text-sm font-medium">{f.label}</p>
                          <p className="text-xs text-muted-foreground">{f.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── STEP: COMPANY ─────────────────────────────────────── */}
                {step.id === 'company' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Bedrijfsnaam *</Label>
                      <Input
                        className="mt-1.5"
                        placeholder="Transport Noord B.V."
                        value={companyForm.name}
                        onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">KVK-nummer</Label>
                        <Input className="mt-1.5" placeholder="12345678"
                          value={companyForm.kvk_number}
                          onChange={e => setCompanyForm(f => ({ ...f, kvk_number: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">BTW-nummer</Label>
                        <Input className="mt-1.5" placeholder="NL123456789B01"
                          value={companyForm.vat_number}
                          onChange={e => setCompanyForm(f => ({ ...f, vat_number: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Adres</Label>
                      <Input className="mt-1.5" placeholder="Transportweg 1, Amsterdam"
                        value={companyForm.address}
                        onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Postcode</Label>
                        <Input className="mt-1.5" placeholder="1234 AB"
                          value={companyForm.postal_code}
                          onChange={e => setCompanyForm(f => ({ ...f, postal_code: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Stad</Label>
                        <Input className="mt-1.5" placeholder="Amsterdam"
                          value={companyForm.city}
                          onChange={e => setCompanyForm(f => ({ ...f, city: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Telefoon</Label>
                        <Input className="mt-1.5" placeholder="+31 20 000 0000"
                          value={companyForm.phone}
                          onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">IBAN</Label>
                        <Input className="mt-1.5" placeholder="NL00 ABCD 0123 4567 89"
                          value={companyForm.iban}
                          onChange={e => setCompanyForm(f => ({ ...f, iban: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP: CUSTOMER ────────────────────────────────────── */}
                {step.id === 'customer' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Bedrijfsnaam klant</Label>
                      <Input className="mt-1.5" placeholder="Klant Logistics B.V."
                        value={customerForm.company_name}
                        onChange={e => setCustomerForm(f => ({ ...f, company_name: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Contactpersoon</Label>
                        <Input className="mt-1.5" placeholder="Jan de Vries"
                          value={customerForm.contact_name}
                          onChange={e => setCustomerForm(f => ({ ...f, contact_name: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Stad</Label>
                        <Input className="mt-1.5" placeholder="Rotterdam"
                          value={customerForm.city}
                          onChange={e => setCustomerForm(f => ({ ...f, city: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">E-mail</Label>
                        <Input className="mt-1.5" type="email" placeholder="info@klant.nl"
                          value={customerForm.email}
                          onChange={e => setCustomerForm(f => ({ ...f, email: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Telefoon</Label>
                        <Input className="mt-1.5" placeholder="+31 10 000 0000"
                          value={customerForm.phone}
                          onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP: TRIP ───────────────────────────────────────── */}
                {step.id === 'trip' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Transportdatum</Label>
                      <Input className="mt-1.5" type="date"
                        value={tripForm.trip_date}
                        onChange={e => setTripForm(f => ({ ...f, trip_date: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Ophaaladres</Label>
                        <Input className="mt-1.5" placeholder="Straat, Stad"
                          value={tripForm.pickup_address}
                          onChange={e => setTripForm(f => ({ ...f, pickup_address: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Afleveradres</Label>
                        <Input className="mt-1.5" placeholder="Straat, Stad"
                          value={tripForm.delivery_address}
                          onChange={e => setTripForm(f => ({ ...f, delivery_address: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Lading omschrijving</Label>
                      <Input className="mt-1.5" placeholder="Pallets, dozen, gewicht..."
                        value={tripForm.cargo_description}
                        onChange={e => setTripForm(f => ({ ...f, cargo_description: e.target.value }))} />
                    </div>
                  </div>
                )}

                {/* ── STEP: DONE ──────────────────────────────────────── */}
                {step.id === 'done' && (
                  <div className="space-y-3">
                    {[
                      { icon: '✅', label: 'Bedrijfsprofiel ingesteld' },
                      { icon: '✅', label: 'Klant toegevoegd' },
                      { icon: '✅', label: 'Eerste rit gepland' },
                      { icon: '🚀', label: 'LogiFlow staat voor je klaar' },
                    ].map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40"
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm font-medium">{item.label}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="px-8 py-6 border-t border-border/40 flex items-center justify-between gap-4">
          {stepIndex > 0 && step.id !== 'done' ? (
            <Button variant="ghost" onClick={() => goTo(stepIndex - 1)} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Terug
            </Button>
          ) : (
            <div />
          )}

          <Button
            onClick={handleNext}
            disabled={saving}
            className={`gap-2 bg-gradient-to-r ${currentGradient} text-white border-0 hover:opacity-90 px-8 shadow-lg`}
            size="lg"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Opslaan...</>
            ) : step.id === 'done' ? (
              <>Naar het dashboard <ArrowRight className="h-4 w-4" /></>
            ) : step.id === 'welcome' ? (
              <>Beginnen <ChevronRight className="h-4 w-4" /></>
            ) : (
              <>Volgende <ChevronRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
