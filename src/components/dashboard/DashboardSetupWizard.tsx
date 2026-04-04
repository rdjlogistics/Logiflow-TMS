import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Sparkles, ChevronRight, Check, Truck, Gauge, Euro,
  TrendingUp, Map, Palette, Zap, Bell, BellOff, Monitor,
  Moon, Sun, LayoutGrid, LayoutList, X, Rocket, Globe,
  ArrowLeft, Star, Navigation, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DASHBOARD_PRESETS, DashboardPreset } from './DashboardPresetSelector';
import { DashboardWidgetConfig } from '@/hooks/useUserPreferences';
import { useTheme } from '@/components/ThemeProvider';
import { hapticSelection } from '@/lib/haptics';
import { useIsMobile } from '@/hooks/use-mobile';

// --- Typing Effect Hook ---
function useTypingEffect(text: string, speed = 40, delay = 300) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed('');
    setDone(false);
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);
  return { displayed, done };
}

// --- Sound ---
const playNotificationSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.1;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
};

// --- Wizard Step Types ---

interface WizardStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'welcome', title: 'Welkom!', subtitle: 'Laten we je command center instellen', icon: Rocket },
  { id: 'preset', title: 'Kies je focus', subtitle: 'Selecteer een dashboard layout', icon: LayoutGrid },
  { id: 'preferences', title: 'Jouw voorkeuren', subtitle: 'Pas je ervaring aan', icon: Sparkles },
  { id: 'ready', title: 'Klaar!', subtitle: 'Je command center is ingericht', icon: Check },
];

// --- Framer Motion Variants ---

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96, filter: 'blur(12px)' },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 260, damping: 24, delay: 0.1 },
  },
  exit: {
    opacity: 0, y: -20, scale: 0.97, filter: 'blur(6px)',
    transition: { duration: 0.25 },
  },
};

const stepContentVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

const mobileStepVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 80 : -80,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -80 : 80,
    transition: { duration: 0.2 },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 25 } },
};

// --- Celebration Emojis ---
const CELEBRATION_EMOJIS = ['🚀', '✨', '🎉', '⚡', '💎', '🔥', '🏆', '💫'];

// --- Component ---

interface DashboardSetupWizardProps {
  onComplete: (config: {
    preset: DashboardPreset | null;
    widgets: DashboardWidgetConfig[];
    compactMode: boolean;
    theme: 'light' | 'dark' | 'system' | 'auto';
    soundEnabled: boolean;
    language: 'nl' | 'en' | 'de';
  }) => void;
  onSkip: () => void;
}

export function DashboardSetupWizard({ onComplete, onSkip }: DashboardSetupWizardProps) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [selectedPreset, setSelectedPreset] = useState<DashboardPreset | null>(null);
  const [compactMode, setCompactMode] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system' | 'auto'>('system');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [language, setLanguage] = useState<'nl' | 'en' | 'de'>('nl');
  const [countdown, setCountdown] = useState<number | null>(null);
  const { setTheme: applyTheme } = useTheme();
  const touchStartX = useRef<number | null>(null);

  const typingSubtitle = useTypingEffect(
    'In 3 snelle stappen richten we jouw command center in — precies zoals jij het wilt.',
    30,
    400
  );

  // ESC key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSkip]);

  // Apply theme in real-time
  const handleThemeChange = useCallback((newTheme: 'light' | 'dark' | 'system' | 'auto') => {
    setTheme(newTheme);
    applyTheme(newTheme);
    hapticSelection();
  }, [applyTheme]);

  const handleSoundToggle = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) playNotificationSound();
    hapticSelection();
  }, [soundEnabled]);

  const selectablePresets = DASHBOARD_PRESETS.filter(p => !p.isCustom);

  const handleNext = useCallback(() => {
    hapticSelection();
    if (step < WIZARD_STEPS.length - 1) {
      setDirection(1);
      setStep(s => s + 1);
    } else {
      onComplete({
        preset: selectedPreset,
        widgets: selectedPreset?.widgets || DASHBOARD_PRESETS[0].widgets,
        compactMode,
        theme,
        soundEnabled,
        language,
      });
    }
  }, [step, selectedPreset, compactMode, theme, soundEnabled, language, onComplete]);

  const handleBack = useCallback(() => {
    hapticSelection();
    if (step > 0) {
      setDirection(-1);
      setStep(s => s - 1);
    }
  }, [step]);

  // Swipe handlers (mobile only)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 60 && step > 0) handleBack();
    if (diff < -60 && step < WIZARD_STEPS.length - 1) handleNext();
    touchStartX.current = null;
  }, [step, handleBack, handleNext]);

  const presetIcons: Record<string, React.ElementType> = {
    operations: Truck, performance: Gauge, finance: Euro,
    executive: TrendingUp, dispatcher: Map, balanced: Sparkles,
  };

  const presetLayouts: Record<string, string[]> = {
    operations: ['bg-primary/30', 'bg-primary/20', 'bg-primary/10'],
    performance: ['bg-success/30', 'bg-success/20', 'bg-success/10'],
    finance: ['bg-gold/30', 'bg-gold/20', 'bg-gold/10'],
    executive: ['bg-primary/30', 'bg-gold/20', 'bg-success/10'],
    dispatcher: ['bg-primary/20', 'bg-primary/30', 'bg-primary/15'],
    balanced: ['bg-primary/20', 'bg-success/20', 'bg-gold/20'],
  };

  // Countdown on step 3
  useEffect(() => {
    if (step === 3 && countdown === null) {
      setCountdown(3);
    }
  }, [step, countdown]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const t = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 800);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // --- Shared step content ---
  const renderStepContent = (mobile: boolean) => (
    <>
      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className={cn("text-center", mobile ? "space-y-6" : "space-y-5")}>
          <motion.div
            className={cn(
              "relative mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center",
              mobile ? "w-20 h-20" : "w-16 h-16 sm:w-20 sm:h-20"
            )}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Rocket className={cn("text-primary", mobile ? "h-9 w-9" : "h-7 w-7 sm:h-9 sm:w-9")} />
            <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl -z-10" />
          </motion.div>
          <div>
            <h2 className={cn("font-bold tracking-tight", mobile ? "text-2xl" : "text-2xl bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent")}>
              Welkom bij je Command Center
            </h2>
            <p className={cn(
              "text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed min-h-[3rem]",
              mobile ? "text-base px-2" : "text-sm sm:text-base"
            )}>
              {typingSubtitle.displayed}
              {!typingSubtitle.done && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
                />
              )}
            </p>
          </div>
          <motion.div
           
           
            className={cn("flex flex-col pt-2", mobile ? "gap-3" : "gap-2")}
          >
            {[
              { icon: LayoutGrid, label: 'Dashboard layout kiezen' },
              { icon: Sparkles, label: 'Voorkeuren instellen' },
              { icon: Zap, label: 'Direct aan de slag' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className={cn(
                  "flex items-center gap-3 rounded-xl bg-muted/20 border border-border/20",
                  mobile ? "px-5 py-3.5" : "px-4 py-2.5"
                )}
              >
                <div className={cn("rounded-lg bg-primary/10", mobile ? "p-2" : "p-1.5")}>
                  <item.icon className={cn("text-primary", mobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
                </div>
                <span className={cn("text-foreground/80", mobile ? "text-base" : "text-sm")}>{item.label}</span>
                <Check className="h-3.5 w-3.5 text-muted-foreground/30 ml-auto" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Step 1: Choose Preset */}
      {step === 1 && (
        <div className={cn(mobile ? "space-y-5" : "space-y-4")}>
          <div className={cn("text-center", mobile ? "mb-3" : "mb-2")}>
            <h2 className={cn("font-bold tracking-tight", mobile ? "text-xl" : "text-lg sm:text-xl")}>Kies je focus</h2>
            <p className={cn("text-muted-foreground mt-1", mobile ? "text-sm" : "text-xs sm:text-sm")}>Welke weergave past bij jouw rol?</p>
          </div>
          <motion.div
           
           
            className={cn(mobile ? "flex flex-col gap-3" : "grid grid-cols-3 gap-3")}
          >
            {selectablePresets.map((preset) => {
              const isSelected = selectedPreset?.id === preset.id;
              const PresetIcon = presetIcons[preset.id] || Sparkles;
              const layoutBlocks = presetLayouts[preset.id] || ['bg-muted/30', 'bg-muted/20', 'bg-muted/10'];

              if (mobile) {
                // Mobile: horizontal card layout
                return (
                  <motion.button
                    key={preset.id}
                    onClick={() => { setSelectedPreset(preset); hapticSelection(); }}

                    className={cn(
                      'relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all touch-manipulation text-left',
                      isSelected
                        ? 'border-primary bg-primary/8 shadow-lg shadow-primary/10'
                        : 'border-border/30 bg-muted/10 active:bg-muted/20'
                    )}
                  >
                    {preset.recommended && (
                      <div className="absolute -top-2 right-3 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                        Aanbevolen
                      </div>
                    )}
                    <div className={cn('p-3 rounded-xl flex-shrink-0', preset.bg)}>
                      <PresetIcon className={cn('h-6 w-6', preset.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{preset.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
                      <div className="flex gap-1 mt-2">
                        {layoutBlocks.map((bg, bi) => (
                          <div key={bi} className={cn('h-1.5 rounded-full', bg, bi === 0 ? 'w-5' : bi === 1 ? 'w-3' : 'w-4')} />
                        ))}
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="flex-shrink-0"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      </motion.div>
                    )}
                  </motion.button>
                );
              }

              // Desktop: Elite Class glassmorphism grid cards
              return (
                <motion.button
                  key={preset.id}
                  onClick={() => { setSelectedPreset(preset); hapticSelection(); }}


                  className={cn(
                    'relative flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all',
                    isSelected
                      ? 'border-primary/50 bg-primary/8 shadow-lg shadow-primary/15'
                      : 'border-border/20 bg-muted/5 hover:border-primary/25 hover:bg-muted/15 hover:shadow-md'
                  )}
                  style={isSelected ? {
                    boxShadow: '0 0 20px -5px hsl(var(--primary) / 0.2), 0 8px 25px -8px hsl(var(--primary) / 0.15)',
                  } : undefined}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="presetCheck"
                      className="absolute top-2.5 right-2.5"
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </motion.div>
                  )}
                  {preset.recommended && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[9px] font-bold uppercase tracking-wider whitespace-nowrap shadow-sm">
                      ✨ Aanbevolen
                    </div>
                  )}
                  <div className={cn('p-3 rounded-xl', preset.bg)}>
                    <PresetIcon className={cn('h-5 w-5', preset.color)} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">{preset.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{preset.description}</p>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {layoutBlocks.map((bg, bi) => (
                      <div key={bi} className={cn('h-1.5 rounded-full', bg, bi === 0 ? 'w-6' : bi === 1 ? 'w-4' : 'w-5')} />
                    ))}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* Step 2: Preferences */}
      {step === 2 && (
        <div className={cn(mobile ? "space-y-5" : "space-y-4")}>
          <div className={cn("text-center", mobile ? "mb-2" : "mb-1")}>
            <h2 className={cn("font-bold tracking-tight", mobile ? "text-xl" : "text-lg sm:text-xl")}>Personaliseer</h2>
            <p className={cn("text-muted-foreground mt-1", mobile ? "text-sm" : "text-xs sm:text-sm")}>Fine-tune je ervaring</p>
          </div>
          <motion.div
           
           
            className={cn(mobile ? "space-y-4" : "space-y-3")}
          >
            {/* Theme */}
            <motion.div className={cn("rounded-2xl bg-muted/15 border border-border/20 space-y-3", mobile ? "p-5" : "p-4")}>
              <p className="text-sm font-semibold flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                Thema
              </p>
              <div className={cn("grid gap-1.5", mobile ? "grid-cols-2" : "grid-cols-4")}>
                {([
                  { value: 'system' as const, icon: Monitor, label: 'Systeem' },
                  { value: 'light' as const, icon: Sun, label: 'Licht' },
                  { value: 'dark' as const, icon: Moon, label: 'Donker' },
                  { value: 'auto' as const, icon: Sparkles, label: 'Auto' },
                ]).map(t => (
                  <motion.button
                    key={t.value}

                    onClick={() => handleThemeChange(t.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border transition-all touch-manipulation',
                      mobile ? 'p-3.5 min-h-[56px]' : 'p-2.5 sm:p-3 min-h-[48px]',
                      theme === t.value
                        ? 'border-primary bg-primary/8 shadow-sm'
                        : 'border-border/20 hover:border-border/50'
                    )}
                  >
                    <t.icon className={cn('h-4 w-4', theme === t.value ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn("font-medium", mobile ? "text-xs" : "text-[10px] sm:text-xs")}>{t.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Language */}
            <motion.div className={cn("rounded-2xl bg-muted/15 border border-border/20 space-y-3", mobile ? "p-5" : "p-4")}>
              <p className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Taal
              </p>
              {mobile ? (
                // Mobile: full-width segmented pills
                <div className="flex rounded-xl bg-muted/30 p-1 border border-border/20">
                  {([
                    { value: 'nl' as const, label: '🇳🇱 NL' },
                    { value: 'en' as const, label: '🇬🇧 EN' },
                    { value: 'de' as const, label: '🇩🇪 DE' },
                  ]).map(l => (
                    <motion.button
                      key={l.value}

                      onClick={() => { setLanguage(l.value); hapticSelection(); }}
                      className={cn(
                        'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all touch-manipulation',
                        language === l.value
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground'
                      )}
                    >
                      {l.label}
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'nl' as const, label: '🇳🇱 NL', full: 'Nederlands' },
                    { value: 'en' as const, label: '🇬🇧 EN', full: 'English' },
                    { value: 'de' as const, label: '🇩🇪 DE', full: 'Deutsch' },
                  ]).map(l => (
                    <motion.button
                      key={l.value}

                      onClick={() => { setLanguage(l.value); hapticSelection(); }}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all min-h-[48px] touch-manipulation',
                        language === l.value
                          ? 'border-primary bg-primary/8 shadow-sm'
                          : 'border-border/20 hover:border-border/50'
                      )}
                    >
                      <span className="text-sm font-bold">{l.label}</span>
                      <span className="text-[10px] text-muted-foreground">{l.full}</span>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Compact Mode */}
            <motion.div>
              <motion.button

                onClick={() => { setCompactMode(!compactMode); hapticSelection(); }}
                className={cn(
                  'w-full flex items-center justify-between rounded-2xl border transition-all touch-manipulation',
                  mobile ? 'p-5 min-h-[56px]' : 'p-4 min-h-[48px]',
                  compactMode
                    ? 'bg-primary/8 border-primary/30'
                    : 'bg-muted/15 border-border/20'
                )}
              >
                <div className="flex items-center gap-3">
                  {compactMode ? <LayoutList className="h-4 w-4 text-primary" /> : <LayoutGrid className="h-4 w-4 text-muted-foreground" />}
                  <div className="text-left">
                    <p className="text-sm font-semibold">Compact modus</p>
                    <p className={cn("text-muted-foreground", mobile ? "text-xs" : "text-[11px]")}>
                      {compactMode ? 'Meer data zichtbaar, kleinere widgets' : 'Standaard formaat, ruime weergave'}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  'w-10 h-6 rounded-full p-0.5 transition-colors flex-shrink-0',
                  compactMode ? 'bg-primary' : 'bg-muted/40'
                )}>
                  <motion.div
                    className="w-5 h-5 rounded-full bg-white shadow-sm"
                    animate={{ x: compactMode ? 16 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </motion.button>
            </motion.div>

            {/* Sound */}
            <motion.div>
              <motion.button

                onClick={handleSoundToggle}
                className={cn(
                  'w-full flex items-center justify-between rounded-2xl border transition-all touch-manipulation',
                  mobile ? 'p-5 min-h-[56px]' : 'p-4 min-h-[48px]',
                  soundEnabled
                    ? 'bg-primary/8 border-primary/30'
                    : 'bg-muted/15 border-border/20'
                )}
              >
                <div className="flex items-center gap-3">
                  {soundEnabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                  <div className="text-left">
                    <p className="text-sm font-semibold">Geluidsnotificaties</p>
                    <p className={cn("text-muted-foreground", mobile ? "text-xs" : "text-[11px]")}>Ontvang audio alerts bij meldingen</p>
                  </div>
                </div>
                <div className={cn(
                  'w-10 h-6 rounded-full p-0.5 transition-colors flex-shrink-0',
                  soundEnabled ? 'bg-primary' : 'bg-muted/40'
                )}>
                  <motion.div
                    className="w-5 h-5 rounded-full bg-white shadow-sm"
                    animate={{ x: soundEnabled ? 16 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Step 3: Ready! */}
      {step === 3 && (
        <div className={cn("text-center relative overflow-hidden", mobile ? "space-y-6" : "space-y-6")}>
          {/* Emoji confetti - mobile only; desktop gets pulse rings */}
          {mobile && CELEBRATION_EMOJIS.map((emoji, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none text-xl"
              initial={{ opacity: 0, y: 60, x: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [60, -20, -60, -100],
                x: [0, (i % 2 === 0 ? 1 : -1) * (15 + i * 8), (i % 2 === 0 ? -1 : 1) * 10],
              }}
              transition={{ duration: 2.5, delay: i * 0.2, ease: 'easeOut' }}
              style={{ left: `${15 + i * 10}%`, top: '50%' }}
            >
              {emoji}
            </motion.div>
          ))}

          {/* Desktop: Cinematic pulse rings */}
          {!mobile && (
            <>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={`ring-${i}`}
                  className="absolute left-1/2 top-12 -translate-x-1/2 rounded-full border pointer-events-none"
                  style={{
                    width: 100 + i * 40,
                    height: 100 + i * 40,
                    borderColor: `hsl(var(--success) / ${0.15 - i * 0.04})`,
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2.5,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </>
          )}

          <motion.div
            className={cn(
              "relative mx-auto rounded-2xl bg-gradient-to-br from-success/20 to-success/5 border border-success/15 flex items-center justify-center",
              mobile ? "w-20 h-20" : "w-20 h-20"
            )}
            initial={{ scale: 0.5, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {countdown !== null && countdown > 0 ? (
              <motion.span
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className={cn("font-bold text-success", mobile ? "text-2xl" : "text-3xl")}
              >
                {countdown}
              </motion.span>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <Check className={cn("text-success", mobile ? "h-9 w-9" : "h-10 w-10")} />
              </motion.div>
            )}
            <div className="absolute inset-0 rounded-2xl bg-success/10 blur-xl -z-10" />
          </motion.div>
          <div>
            <h2 className={cn("font-bold tracking-tight", mobile ? "text-2xl" : "text-2xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent")}>
              {countdown !== null && countdown > 0 ? `${countdown}...` : 'Je bent klaar!'}
            </h2>
            <p className={cn("text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed", mobile ? "text-base" : "text-sm")}>
              Je command center is ingericht met{' '}
              <span className="font-semibold text-foreground">{selectedPreset?.name || 'Operaties'}</span>
              {' '}layout. Je kunt dit altijd aanpassen via het tandwiel-icoon.
            </p>
          </div>
          <motion.div
           
           
            className="flex flex-wrap justify-center gap-2 pt-2"
          >
            {(selectedPreset?.widgets || DASHBOARD_PRESETS[0].widgets).slice(0, 5).map((w, i) => (
              <motion.div
                key={w.id}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs font-medium",
                  mobile
                    ? "bg-muted/20 border-border/20 text-muted-foreground"
                    : "bg-muted/10 border-border/15 text-muted-foreground backdrop-blur-sm"
                )}
              >
                {w.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </motion.div>
            ))}
            {(selectedPreset?.widgets || DASHBOARD_PRESETS[0].widgets).length > 5 && (
              <motion.div
                className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium"
              >
                +{(selectedPreset?.widgets || DASHBOARD_PRESETS[0].widgets).length - 5} meer
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );

  // ========== MOBILE LAYOUT ==========
  if (isMobile) {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) onSkip(); }}>
        <DialogContent variant="sheet" size="full" hideCloseButton className="p-0 max-h-[92vh] flex flex-col overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col h-full bg-background"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.15), transparent 70%)' }}
        />

        {/* Top bar: Back + Progress dots */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2">
          <div className="w-12">
            {step > 0 && step < 3 ? (
              <motion.button

                onClick={handleBack}
                className="p-2 -ml-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
              >
                <ArrowLeft className="h-5 w-5" />
              </motion.button>
            ) : step === 0 ? (
              <motion.button

                onClick={onSkip}
                className="text-xs text-muted-foreground py-2 px-1 min-h-[48px] flex items-center"
              >
                Skip
              </motion.button>
            ) : null}
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((s, i) => (
              <motion.div
                key={s.id}
                className={cn(
                  'rounded-full transition-all',
                  i === step
                    ? 'bg-primary'
                    : i < step
                      ? 'bg-primary/40'
                      : 'bg-muted-foreground/20'
                )}
                animate={{
                  width: i === step ? 24 : 8,
                  height: 8,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            ))}
          </div>

          <div className="w-12 flex justify-end">
            <motion.button

              onClick={onSkip}
              className="p-2 -mr-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-5 pb-32">
          <div className="pt-4">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
               
               
                exit="exit"
              >
                {renderStepContent(true)}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Fixed bottom CTA */}
        <div
          className="fixed bottom-0 left-0 right-0 z-[201] pointer-events-none"
        >
          {/* Gradient fade */}
          <div className="h-16 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div
            className="bg-background px-5 pb-2 pointer-events-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
          >
            <motion.div>
              <Button
                onClick={handleNext}
                className={cn(
                  'w-full h-14 text-base rounded-2xl shadow-lg gap-2 font-semibold',
                  step === 3
                    ? 'bg-gradient-to-r from-success to-success/90 shadow-success/20'
                    : 'bg-gradient-to-r from-primary to-primary/90 shadow-primary/20'
                )}
              >
                {step === 0 && (
                  <>
                    Laten we beginnen
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
                {step === 1 && (
                  <>
                    Doorgaan
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
                {step === 2 && (
                  <>
                    Afronden
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
                {step === 3 && (
                  <>
                    <Zap className="h-5 w-5" />
                    Open mijn dashboard
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
        </DialogContent>
      </Dialog>
    );
  }

  // ========== ELITE CLASS DESKTOP LAYOUT ==========

  // Step icons for the hero visual
  const stepHeroIcons = [Rocket, LayoutGrid, Sparkles, Check];
  const CurrentHeroIcon = stepHeroIcons[step] || Rocket;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onSkip(); }}>
      <DialogContent variant="default" size="full" hideCloseButton className="p-0 max-w-[95vw] max-h-[90vh] overflow-hidden rounded-2xl">
    <AnimatePresence>
      <motion.div
       
       
        exit="exit"
        className="flex w-full h-[85vh]"
        style={{
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        {/* ===== LEFT PANEL - Immersive Branding (45%) ===== */}
        <motion.div
          className="relative w-[45%] h-full overflow-hidden flex flex-col items-center justify-center"
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 30, delay: 0.1 }}
        >
          {/* Multi-layer mesh gradient background */}
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 30%, hsl(var(--primary) / 0.15), transparent),
              radial-gradient(ellipse 60% 80% at 80% 70%, hsl(var(--primary) / 0.08), transparent),
              radial-gradient(ellipse 90% 50% at 50% 50%, hsl(var(--primary) / 0.05), transparent),
              hsl(var(--background))
            `,
          }} />

          {/* Animated mesh gradient overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
            style={{
              background: 'conic-gradient(from 0deg at 50% 50%, hsl(var(--primary) / 0.04), transparent, hsl(var(--primary) / 0.06), transparent, hsl(var(--primary) / 0.04))',
            }}
          />

          {/* Floating particle orbs */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 4 + (i % 3) * 4,
                height: 4 + (i % 3) * 4,
                background: i % 2 === 0
                  ? 'hsl(var(--primary) / 0.4)'
                  : 'hsl(var(--primary) / 0.2)',
                top: `${15 + i * 10}%`,
                left: `${10 + (i * 11) % 80}%`,
                willChange: 'transform',
              }}
              animate={{
                y: [0, -20 - i * 5, 0],
                x: [0, Math.sin(i * 0.8) * 15, 0],
                opacity: [0.3, 0.7, 0.3],
                scale: [0.8, 1.3, 0.8],
              }}
              transition={{
                duration: 4 + i * 0.7,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Sparkle accents */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute pointer-events-none"
              style={{
                top: `${25 + i * 15}%`,
                left: `${20 + i * 18}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.2, 0.5],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                delay: i * 0.8,
              }}
            >
              <Star className="w-3 h-3 text-primary/30 fill-primary/20" />
            </motion.div>
          ))}

          {/* ===== Floating Command Tower Hero ===== */}
          <div className="relative z-10 flex flex-col items-center gap-8">
            {/* Pulsating glow ring */}
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 200,
                height: 200,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, hsl(var(--primary) / 0.12), transparent 70%)',
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Main hero icon container */}
            <motion.div
              className="relative"
              animate={{
                y: [-6, 6, -6],
                rotateY: [-3, 3, -3],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                transformStyle: 'preserve-3d',
                willChange: 'transform',
              }}
            >
              {/* Shadow */}
              <motion.div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full blur-xl"
                style={{ background: 'hsl(var(--primary) / 0.2)' }}
                animate={{ scale: [1, 0.85, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Glassmorphism icon container */}
              <motion.div
                className="relative p-8 rounded-3xl border border-border/15"
                style={{
                  background: 'hsl(var(--card) / 0.3)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  boxShadow: `
                    0 25px 60px -15px hsl(var(--primary) / 0.2),
                    0 0 80px -20px hsl(var(--primary) / 0.15),
                    inset 0 1px 0 rgba(255,255,255,0.08),
                    inset 0 -1px 0 rgba(0,0,0,0.05)
                  `,
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.6, opacity: 0, rotate: 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <CurrentHeroIcon
                      className="w-16 h-16 text-primary"
                      strokeWidth={1.5}
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Orbiting dots */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    animate={{
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 4 + i * 2,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    style={{
                      top: '50%',
                      left: '50%',
                      width: 6 - i,
                      height: 6 - i,
                      borderRadius: '50%',
                      background: `hsl(var(--primary) / ${0.5 - i * 0.12})`,
                      transformOrigin: `0px ${-50 - i * 10}px`,
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>

            {/* Branding text */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 25 }}
            >
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
                Command Center
              </h1>
              <p className="text-sm text-muted-foreground/70 mt-2 font-medium">
                Elite Class Dashboard Setup
              </p>
            </motion.div>

            {/* Vertical Step Progress Indicator */}
            <motion.div
              className="flex flex-col gap-1 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {WIZARD_STEPS.map((s, i) => {
                const StepIcon = s.icon;
                const isActive = i === step;
                const isCompleted = i < step;

                return (
                  <div key={s.id} className="flex items-center gap-3">
                    {/* Step circle */}
                    <motion.div
                      className={cn(
                        'relative w-8 h-8 rounded-full flex items-center justify-center border transition-all',
                        isActive
                          ? 'border-primary bg-primary/15'
                          : isCompleted
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-border/30 bg-muted/10'
                      )}
                      animate={isActive ? {
                        boxShadow: [
                          '0 0 0 0 hsl(var(--primary) / 0)',
                          '0 0 0 6px hsl(var(--primary) / 0.15)',
                          '0 0 0 0 hsl(var(--primary) / 0)',
                        ],
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </motion.div>
                      ) : (
                        <StepIcon className={cn(
                          'w-3.5 h-3.5',
                          isActive ? 'text-primary' : 'text-muted-foreground/40'
                        )} />
                      )}
                    </motion.div>

                    {/* Step label */}
                    <span className={cn(
                      'text-xs font-medium transition-colors',
                      isActive ? 'text-foreground' : isCompleted ? 'text-foreground/60' : 'text-muted-foreground/40'
                    )}>
                      {s.title}
                    </span>

                    {/* Connection line (except last) */}
                    {i < WIZARD_STEPS.length - 1 && (
                      <div className="sr-only" />
                    )}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </motion.div>

        {/* ===== RIGHT PANEL - Wizard Content (55%) ===== */}
        <motion.div
          className="relative w-[55%] h-full flex items-center justify-center"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 30, delay: 0.15 }}
        >
          {/* Subtle background */}
          <div className="absolute inset-0" style={{
            background: 'hsl(var(--background))',
          }} />

          {/* Separator line */}
          <div className="absolute left-0 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-border/30 to-transparent" />

          {/* Skip button */}
          <motion.button
            onClick={onSkip}


            className="absolute top-6 right-6 z-10 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Overslaan (ESC)"
          >
            <X className="h-4 w-4" />
          </motion.button>

          {/* Content container */}
          <div className="relative w-full max-w-xl px-12 py-8">
            {/* Glassmorphism content card */}
            <motion.div
              className="relative rounded-3xl border border-border/15 overflow-hidden"
              style={{
                background: 'hsl(var(--card) / 0.6)',
                backdropFilter: 'blur(30px) saturate(160%)',
                WebkitBackdropFilter: 'blur(30px) saturate(160%)',
                boxShadow: `
                  0 20px 60px -15px hsl(var(--background) / 0.5),
                  inset 0 1px 0 rgba(255,255,255,0.06)
                `,
              }}
            >
              {/* Top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none z-[1]"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 5, repeat: Infinity, repeatDelay: 8, ease: 'easeInOut' }}
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.015), transparent)', width: '30%' }}
              />

              <div className="relative p-8">
                {/* Segmented progress bar */}
                <div className="flex items-center gap-1.5 mb-8">
                  {WIZARD_STEPS.map((s, i) => (
                    <div key={s.id} className="flex-1 relative">
                      <div className="h-1 rounded-full bg-muted/20 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: i <= step
                              ? 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))'
                              : 'transparent',
                          }}
                          initial={{ width: '0%' }}
                          animate={{ width: i <= step ? '100%' : '0%' }}
                          transition={{ type: 'spring', stiffness: 200, damping: 25, delay: i * 0.05 }}
                        />
                      </div>
                      {/* Active glow pulse */}
                      {i === step && (
                        <motion.div
                          className="absolute -top-0.5 right-0 w-2 h-2 rounded-full bg-primary"
                          animate={{
                            boxShadow: [
                              '0 0 0 0 hsl(var(--primary) / 0)',
                              '0 0 0 4px hsl(var(--primary) / 0.2)',
                              '0 0 0 0 hsl(var(--primary) / 0)',
                            ],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 50, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -50, filter: 'blur(8px)' }}
                    transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                  >
                    {renderStepContent(false)}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/10">
                  <div>
                    {step > 0 && step < 3 && (
                      <motion.div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBack}
                          className="text-muted-foreground gap-1.5"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          Vorige
                        </Button>
                      </motion.div>
                    )}
                    {step === 0 && (
                      <motion.div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onSkip}
                          className="text-muted-foreground"
                        >
                          Overslaan
                        </Button>
                      </motion.div>
                    )}
                  </div>

                  <motion.div>
                    <Button
                      size="lg"
                      onClick={handleNext}
                      className={cn(
                        'relative px-8 gap-2 rounded-2xl font-semibold overflow-hidden transition-shadow',
                        step === 3
                          ? 'bg-gradient-to-r from-success to-success/90 shadow-lg shadow-success/25 hover:shadow-xl hover:shadow-success/35'
                          : 'bg-gradient-to-r from-primary to-primary/85 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35'
                      )}
                    >
                      {/* Button shimmer */}
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                          width: '40%',
                        }}
                      />
                      {step === 0 && (
                        <>
                          Laten we beginnen
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                      {step === 1 && (
                        <>
                          Doorgaan
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                      {step === 2 && (
                        <>
                          Afronden
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                      {step === 3 && (
                        <>
                          <Zap className="h-4 w-4" />
                          Open mijn dashboard
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default DashboardSetupWizard;
