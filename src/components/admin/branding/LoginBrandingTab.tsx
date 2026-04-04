import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Lock, 
  Upload, 
  X, 
  Plus,
  Trash2,
  Zap,
  Shield,
  Sparkles,
  Truck,
  Clock,
  Globe,
  BarChart3,
  Users,
  CheckCircle
} from 'lucide-react';
import { BrandingConfig, FeatureHighlight } from '@/hooks/useBrandingSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LoginBrandingTabProps {
  settings: BrandingConfig;
  onUpdate: (settings: BrandingConfig) => void;
  onUploadBackground: (file: File) => Promise<string | null>;
}

const AVAILABLE_ICONS = [
  { key: 'Zap', icon: Zap, label: 'Bliksem' },
  { key: 'Shield', icon: Shield, label: 'Schild' },
  { key: 'Sparkles', icon: Sparkles, label: 'Sterren' },
  { key: 'Truck', icon: Truck, label: 'Vrachtwagen' },
  { key: 'Clock', icon: Clock, label: 'Klok' },
  { key: 'Globe', icon: Globe, label: 'Wereld' },
  { key: 'BarChart3', icon: BarChart3, label: 'Grafiek' },
  { key: 'Users', icon: Users, label: 'Gebruikers' },
  { key: 'CheckCircle', icon: CheckCircle, label: 'Vinkje' },
];

const getIconComponent = (iconKey: string) => {
  const found = AVAILABLE_ICONS.find(i => i.key === iconKey);
  return found?.icon || Zap;
};

const LoginBrandingTab = ({ settings, onUpdate, onUploadBackground }: LoginBrandingTabProps) => {
  const [uploading, setUploading] = useState(false);

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      await onUploadBackground(file);
      setUploading(false);
    }
  };

  const updateLoginBranding = (updates: Partial<typeof settings.loginBranding>) => {
    onUpdate({
      ...settings,
      loginBranding: {
        ...settings.loginBranding,
        ...updates,
      },
    });
  };

  const addFeatureHighlight = () => {
    if (settings.loginBranding.featureHighlights.length >= 3) return;
    
    const newHighlight: FeatureHighlight = {
      icon: 'Zap',
      title: 'Nieuw kenmerk',
      description: 'Beschrijving van dit kenmerk',
    };
    
    updateLoginBranding({
      featureHighlights: [...settings.loginBranding.featureHighlights, newHighlight],
    });
  };

  const updateFeatureHighlight = (index: number, updates: Partial<FeatureHighlight>) => {
    const newHighlights = [...settings.loginBranding.featureHighlights];
    newHighlights[index] = { ...newHighlights[index], ...updates };
    updateLoginBranding({ featureHighlights: newHighlights });
  };

  const removeFeatureHighlight = (index: number) => {
    const newHighlights = settings.loginBranding.featureHighlights.filter((_, i) => i !== index);
    updateLoginBranding({ featureHighlights: newHighlights });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Login Pagina Aanpassing
          </CardTitle>
          <CardDescription>
            Pas de login pagina aan met uw eigen branding en welkomsttekst
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Welcome Text */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Welkomst Titel</Label>
              <Input
                value={settings.loginBranding.welcomeTitle || ''}
                onChange={(e) => updateLoginBranding({ welcomeTitle: e.target.value })}
                placeholder="Welkom"
              />
            </div>
            <div className="space-y-2">
              <Label>Welkomst Subtitel</Label>
              <Input
                value={settings.loginBranding.welcomeSubtitle || ''}
                onChange={(e) => updateLoginBranding({ welcomeSubtitle: e.target.value })}
                placeholder="Premium Logistiek Platform"
              />
            </div>
          </div>

          {/* Background Image */}
          <div className="space-y-3">
            <Label>Achtergrond Afbeelding</Label>
            {settings.loginBranding.backgroundImageUrl ? (
              <div className="relative group">
                <div className="h-40 rounded-xl border-2 border-dashed border-border bg-muted/30 overflow-hidden">
                  <img 
                    src={settings.loginBranding.backgroundImageUrl} 
                    alt="Login achtergrond" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => updateLoginBranding({ backgroundImageUrl: null })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div 
                className="h-40 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-muted/30 cursor-pointer hover:border-primary transition-colors"
                onClick={() => document.getElementById('login-bg-upload')?.click()}
              >
                {uploading ? (
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Klik om achtergrond te uploaden</span>
                  </>
                )}
              </div>
            )}
            <input
              id="login-bg-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBackgroundUpload}
            />
            <p className="text-xs text-muted-foreground">
              PNG of JPG • Aanbevolen: 1920x1080px • Max 5MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Feature Highlights
              </CardTitle>
              <CardDescription>
                Toon maximaal 3 kenmerken op de login pagina
              </CardDescription>
            </div>
            {settings.loginBranding.featureHighlights.length < 3 && (
              <Button onClick={addFeatureHighlight} size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Toevoegen
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {settings.loginBranding.featureHighlights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nog geen features toegevoegd</p>
              <Button onClick={addFeatureHighlight} variant="link" className="mt-2">
                Voeg je eerste feature toe
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {settings.loginBranding.featureHighlights.map((highlight, index) => {
                const IconComponent = getIconComponent(highlight.icon);
                
                return (
                  <div 
                    key={index} 
                    className="flex gap-4 p-4 rounded-xl border bg-muted/30"
                  >
                    <div className="space-y-2">
                      <Label className="text-xs">Icoon</Label>
                      <Select
                        value={highlight.icon}
                        onValueChange={(value) => updateFeatureHighlight(index, { icon: value })}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_ICONS.map((iconOption) => {
                            const OptionIcon = iconOption.icon;
                            return (
                              <SelectItem key={iconOption.key} value={iconOption.key}>
                                <div className="flex items-center gap-2">
                                  <OptionIcon className="h-4 w-4" />
                                  <span>{iconOption.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Titel</Label>
                        <Input
                          value={highlight.title}
                          onChange={(e) => updateFeatureHighlight(index, { title: e.target.value })}
                          placeholder="Feature titel"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Beschrijving</Label>
                        <Input
                          value={highlight.description}
                          onChange={(e) => updateFeatureHighlight(index, { description: e.target.value })}
                          placeholder="Korte beschrijving"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 self-start"
                      onClick={() => removeFeatureHighlight(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="rounded-xl overflow-hidden border h-64 relative"
            style={{
              backgroundImage: settings.loginBranding.backgroundImageUrl 
                ? `url(${settings.loginBranding.backgroundImageUrl})` 
                : 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 to-background/60" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-center max-w-md">
              <h2 className="text-2xl font-bold mb-2">
                {settings.loginBranding.welcomeTitle || 'Welkom'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {settings.loginBranding.welcomeSubtitle || 'Premium Logistiek Platform'}
              </p>
              {settings.loginBranding.featureHighlights.length > 0 && (
                <div className="space-y-3">
                  {settings.loginBranding.featureHighlights.slice(0, 3).map((highlight, index) => {
                    const IconComponent = getIconComponent(highlight.icon);
                    return (
                      <div key={index} className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{highlight.title}</div>
                          <div className="text-xs text-muted-foreground">{highlight.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginBrandingTab;
