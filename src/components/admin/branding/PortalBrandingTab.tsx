import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Layout, 
  Upload, 
  Building2, 
  Users, 
  Truck,
  X,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { BrandingConfig, PortalBrandingConfig } from '@/hooks/useBrandingSettings';

interface PortalBrandingTabProps {
  settings: BrandingConfig;
  onUpdate: (settings: BrandingConfig) => void;
  onUploadPortalLogo: (portal: 'b2b' | 'b2c' | 'driver', file: File) => Promise<string | null>;
}

const PORTALS = [
  { 
    key: 'b2b' as const, 
    name: 'B2B Portaal', 
    description: 'Zakelijke klanten portaal',
    icon: Building2,
    defaultWelcome: 'Welkom bij ons B2B portaal. Beheer uw zendingen en facturen op één plek.'
  },
  { 
    key: 'b2c' as const, 
    name: 'B2C Portaal', 
    description: 'Consumenten portaal',
    icon: Users,
    defaultWelcome: 'Welkom! Volg uw pakket en bekijk de bezorgstatus in real-time.'
  },
  { 
    key: 'driver' as const, 
    name: 'Chauffeur Portaal', 
    description: 'Chauffeurs app interface',
    icon: Truck,
    defaultWelcome: 'Welkom chauffeur! Bekijk uw ritten en updates hier.'
  },
];

const PortalBrandingTab = ({ settings, onUpdate, onUploadPortalLogo }: PortalBrandingTabProps) => {
  const [uploadingPortal, setUploadingPortal] = useState<string | null>(null);

  const handleLogoUpload = async (portal: 'b2b' | 'b2c' | 'driver', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingPortal(portal);
      await onUploadPortalLogo(portal, file);
      setUploadingPortal(null);
    }
  };

  const updatePortalBranding = (portal: 'b2b' | 'b2c' | 'driver', updates: Partial<PortalBrandingConfig>) => {
    onUpdate({
      ...settings,
      portalBranding: {
        ...settings.portalBranding,
        [portal]: {
          ...settings.portalBranding[portal],
          ...updates,
        },
      },
    });
  };

  const resetPortalBranding = (portal: 'b2b' | 'b2c' | 'driver') => {
    const defaultConfig: PortalBrandingConfig = {
      primaryColor: settings.primaryColor,
      logo: null,
      welcomeText: null,
    };
    updatePortalBranding(portal, defaultConfig);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-primary" />
          Portaal Branding
        </CardTitle>
        <CardDescription>
          Configureer aparte branding voor elk portaal (B2B, B2C, Chauffeur)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {PORTALS.map((portal) => {
            const Icon = portal.icon;
            const portalSettings = settings.portalBranding[portal.key];
            
            return (
              <AccordionItem key={portal.key} value={portal.key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{portal.name}</div>
                      <div className="text-xs text-muted-foreground">{portal.description}</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="space-y-6 pl-11">
                    {/* Portal Logo */}
                    <div className="space-y-3">
                      <Label>Portaal Logo</Label>
                      {portalSettings.logo ? (
                        <div className="relative group inline-block">
                          <div className="h-20 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center p-3">
                            <img 
                              src={portalSettings.logo} 
                              alt={`${portal.name} logo`} 
                              className="max-h-full max-w-[200px] object-contain"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => updatePortalBranding(portal.key, { logo: null })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="h-20 w-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-muted/30 cursor-pointer hover:border-primary transition-colors"
                          onClick={() => document.getElementById(`portal-logo-${portal.key}`)?.click()}
                        >
                          {uploadingPortal === portal.key ? (
                            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                          ) : (
                            <>
                              <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                              <span className="text-xs text-muted-foreground">Upload logo</span>
                            </>
                          )}
                        </div>
                      )}
                      <input
                        id={`portal-logo-${portal.key}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoUpload(portal.key, e)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Laat leeg om het hoofdlogo te gebruiken
                      </p>
                    </div>

                    {/* Primary Color */}
                    <div className="space-y-2">
                      <Label>Primaire Kleur</Label>
                      <div className="flex gap-3">
                        <Input
                          type="color"
                          value={portalSettings.primaryColor || settings.primaryColor}
                          onChange={(e) => updatePortalBranding(portal.key, { primaryColor: e.target.value })}
                          className="w-14 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={portalSettings.primaryColor || settings.primaryColor}
                          onChange={(e) => updatePortalBranding(portal.key, { primaryColor: e.target.value })}
                          placeholder={settings.primaryColor}
                          className="flex-1 max-w-[200px]"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Laat leeg om de hoofdkleur te gebruiken
                      </p>
                    </div>

                    {/* Welcome Text */}
                    <div className="space-y-2">
                      <Label>Welkomsttekst</Label>
                      <Textarea
                        value={portalSettings.welcomeText || ''}
                        onChange={(e) => updatePortalBranding(portal.key, { welcomeText: e.target.value })}
                        placeholder={portal.defaultWelcome}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Wordt getoond op de startpagina van het portaal
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => resetPortalBranding(portal.key)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset naar standaard
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(`/${portal.key}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Preview portaal
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default PortalBrandingTab;
