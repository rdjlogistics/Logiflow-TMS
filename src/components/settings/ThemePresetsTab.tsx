import { useTheme, type ThemePreset } from '@/components/ThemeProvider';
import { Check, Moon, Sun, Monitor, Sparkles, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import { useSaveTenantTheme } from '@/hooks/useSaveTenantTheme';
import { useTenantSettings } from '@/hooks/useTenantSettings';

interface PresetConfig {
  id: ThemePreset;
  name: string;
  description: string;
  tag: string;
  colors: {
    bg: string;
    card: string;
    primary: string;
    accent: string;
    sidebar: string;
    border: string;
    text: string;
    chart1: string;
    chart2: string;
    chart3: string;
  };
}

const presets: PresetConfig[] = [
  {
    id: 'imperial',
    name: 'Imperial',
    description: 'Donker sapphire-blauw met gouden accenten. Luxe glassmorphism en diepe schaduwen.',
    tag: 'Standaard',
    colors: {
      bg: '#0C1220', card: '#111827', primary: '#4A7CFF', accent: '#E8A838',
      sidebar: '#080E1A', border: '#1E293B', text: '#E2E8F0',
      chart1: '#4A7CFF', chart2: '#E8A838', chart3: '#34D399',
    },
  },
  {
    id: 'vision-pro',
    name: 'Vision Pro',
    description: 'Spatial computing met 3D parallax, frosted glass panels en muis-reactieve beweging.',
    tag: 'Spatial 3D',
    colors: {
      bg: '#09090B', card: '#111114', primary: '#A855F7', accent: '#22D3EE',
      sidebar: '#06060A', border: '#27272A', text: '#F0F0F0',
      chart1: '#A855F7', chart2: '#22D3EE', chart3: '#34D399',
    },
  },
  {
    id: 'horizon',
    name: 'Horizon',
    description: 'Elektrisch blauw met neon gradient borders, geanimeerde glows en magenta accenten.',
    tag: 'Neon Gradient',
    colors: {
      bg: '#0D1026', card: '#141838', primary: '#3B82F6', accent: '#EC4899',
      sidebar: '#080A1A', border: '#1E2448', text: '#E2E8F0',
      chart1: '#3B82F6', chart2: '#00BCD4', chart3: '#EC4899',
    },
  },
  {
    id: 'carbon',
    name: 'Carbon',
    description: 'Warm navy met amber accent. Scherpe corners, zakelijke data-first uitstraling.',
    tag: 'Business',
    colors: {
      bg: '#0F1520', card: '#151D2C', primary: '#E68A2E', accent: '#3B9ECF',
      sidebar: '#0B1018', border: '#253040', text: '#ECE6DA',
      chart1: '#E68A2E', chart2: '#3B9ECF', chart3: '#58B368',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Noorderlicht-geïnspireerd met teal, emerald en cyan. Animated gradient mesh achtergrond.',
    tag: 'Northern Lights',
    colors: {
      bg: '#0A1A1F', card: '#0F2229', primary: '#14B8A6', accent: '#10B981',
      sidebar: '#071318', border: '#1A3A42', text: '#E0F2F1',
      chart1: '#14B8A6', chart2: '#22D3EE', chart3: '#10B981',
    },
  },
];

function MiniMockup({ preset, isActive }: { preset: PresetConfig; isActive: boolean }) {
  const c = preset.colors;
  return (
    <div
      className="relative w-full aspect-[16/10] rounded-lg overflow-hidden"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[22%]"
        style={{ background: c.sidebar, borderRight: `1px solid ${c.border}` }}
      >
        <div className="mx-auto mt-[12%] w-[40%] h-[8%] rounded-sm" style={{ background: c.primary, opacity: 0.8 }} />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="mx-[12%] h-[6%] rounded-sm"
            style={{
              marginTop: i === 0 ? '20%' : '8%',
              background: i === 0 ? c.primary : c.text,
              opacity: i === 0 ? 0.9 : 0.15,
            }}
          />
        ))}
      </div>
      <div className="absolute left-[22%] top-0 right-0 bottom-0 p-[4%]">
        <div className="h-[8%] w-[45%] rounded-sm mb-[4%]" style={{ background: c.text, opacity: 0.2 }} />
        <div className="flex gap-[3%] mb-[4%]">
          {[c.primary, c.accent, c.chart3].map((color, i) => (
            <div
              key={i}
              className="flex-1 aspect-[2/1] rounded-sm relative overflow-hidden"
              style={{ background: c.card, border: `1px solid ${c.border}` }}
            >
              <div className="absolute top-[15%] left-[12%] w-[60%] h-[20%] rounded-sm" style={{ background: c.text, opacity: 0.15 }} />
              <div className="absolute bottom-[15%] left-[12%] w-[40%] h-[28%] rounded-sm" style={{ background: color, opacity: 0.7 }} />
            </div>
          ))}
        </div>
        <div
          className="h-[45%] rounded-sm relative overflow-hidden"
          style={{ background: c.card, border: `1px solid ${c.border}` }}
        >
          <div className="absolute bottom-0 left-[8%] right-[8%] top-[30%] flex items-end gap-[4%]">
            {[65, 80, 45, 90, 55, 70, 85, 40].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${h}%`,
                  background: i % 3 === 0 ? c.chart1 : i % 3 === 1 ? c.chart2 : c.chart3,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {isActive && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 2px ${c.primary}, 0 0 20px -4px ${c.primary}60` }}
        />
      )}
    </div>
  );
}

export function ThemePresetsTab() {
  const { themePreset, setThemePreset, theme, setTheme } = useTheme();
  const { isAdmin } = useUserRole();
  const saveTenantTheme = useSaveTenantTheme();
  const { data: tenantSettings } = useTenantSettings();

  const tenantPreset = tenantSettings?.theme_preset;
  const tenantMode = tenantSettings?.theme_mode;

  const handlePresetChange = (presetId: ThemePreset) => {
    setThemePreset(presetId);
  };

  const handleSaveForCompany = () => {
    saveTenantTheme.mutate({
      theme_preset: themePreset,
      theme_mode: theme,
    });
  };

  return (
    <div className="space-y-6">
      {/* Admin save-for-company button */}
      {isAdmin && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h3 className="text-sm font-semibold">Bedrijfsthema</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sla het huidige thema op als standaard voor alle medewerkers
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSaveForCompany}
            disabled={saveTenantTheme.isPending}
            className="shrink-0"
          >
            {saveTenantTheme.isPending ? 'Opslaan...' : 'Opslaan voor bedrijf'}
          </Button>
        </div>
      )}

      {/* Preset selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {presets.map((preset) => {
          const isActive = themePreset === preset.id;
          const isTenantDefault = tenantPreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              className={cn(
                "relative rounded-2xl p-4 text-left transition-all",
                "border bg-card/60 backdrop-blur-sm",
                isActive
                  ? "border-primary/50 shadow-glow ring-1 ring-primary/20"
                  : "border-border/40 hover:border-border/60 hover:shadow-lg"
              )}
            >
              {/* Badges */}
              <div className="absolute top-3 right-3 z-10 flex gap-1.5">
                {isTenantDefault && (
                  <Badge variant="outline" className="gap-1 text-[10px] px-2 py-0.5 border-primary/30 text-primary">
                    <Building2 className="h-2.5 w-2.5" />
                    Bedrijf
                  </Badge>
                )}
                {isActive && (
                  <div>
                    <Badge className="badge-gradient gap-1 text-[10px] px-2 py-0.5">
                      <Check className="h-3 w-3" />
                      Actief
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {preset.tag}
                </span>
              </div>

              <MiniMockup preset={preset} isActive={isActive} />

              <div className="mt-3">
                <h3 className="font-bold text-sm">{preset.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="flex gap-1.5 mt-3">
                {[preset.colors.primary, preset.colors.accent, preset.colors.chart3, preset.colors.bg].map(
                  (color, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border border-border/30"
                      style={{ background: color }}
                    />
                  )
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Light/Dark mode toggle */}
      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Kleurmodus</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kies licht, donker of volg je systeem
              {tenantMode && (
                <span className="text-primary/70"> · Bedrijfsstandaard: {tenantMode === 'dark' ? 'Donker' : tenantMode === 'light' ? 'Licht' : tenantMode === 'system' ? 'Systeem' : tenantMode}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {[
            { value: 'light' as const, icon: Sun, label: 'Licht' },
            { value: 'dark' as const, icon: Moon, label: 'Donker' },
            { value: 'system' as const, icon: Monitor, label: 'Systeem' },
          ].map((mode) => {
            const isActive = theme === mode.value;
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                onClick={() => setTheme(mode.value)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium flex-1 justify-center transition-colors",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/25"
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
