import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Upload, 
  Globe, 
  Image, 
  FileText, 
  Mail, 
  Save, 
  Loader2,
  Eye,
  X,
  Languages,
  Layout,
  Lock,
  Share2
} from 'lucide-react';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PortalBrandingTab from '@/components/admin/branding/PortalBrandingTab';
import SocialMediaTab from '@/components/admin/branding/SocialMediaTab';
import LoginBrandingTab from '@/components/admin/branding/LoginBrandingTab';
import EmailPreviewSection from '@/components/admin/branding/EmailPreviewSection';

const BrandingSettings = () => {
  const { branding, loading, saving, updateBranding, uploadLogo, uploadFavicon, uploadPortalLogo, uploadLoginBackground } = useBrandingSettings();
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  
  // Local state for form editing
  const [settings, setSettings] = useState(branding);
  
  // Sync local state when branding loads
  useEffect(() => {
    setSettings(branding);
  }, [branding]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadLogo(file);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFavicon(file);
    }
  };

  const handleSave = async () => {
    await updateBranding(settings);
  };
  
  const updateSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
  };

  if (loading) {
    return (
      <DashboardLayout title="White-Label Branding">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="White-Label Branding" description="Pas de look & feel van uw platform aan">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Palette className="h-5 w-5 text-primary-foreground" />
              </div>
              <span>White-Label Branding</span>
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm hidden sm:block">
              Configureer uw bedrijfsbranding voor een gepersonaliseerde ervaring
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Opslaan
          </Button>
        </div>

        <Tabs defaultValue="visual" className="space-y-6">
          <TabsList className="grid grid-cols-7 w-full max-w-3xl">
            <TabsTrigger value="visual" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden lg:inline">Visueel</span>
            </TabsTrigger>
            <TabsTrigger value="portals" className="gap-2">
              <Layout className="h-4 w-4" />
              <span className="hidden lg:inline">Portalen</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden lg:inline">Documenten</span>
            </TabsTrigger>
            <TabsTrigger value="emails" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden lg:inline">E-mails</span>
            </TabsTrigger>
            <TabsTrigger value="login" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden lg:inline">Login</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden lg:inline">Social</span>
            </TabsTrigger>
            <TabsTrigger value="domain" className="gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden lg:inline">Domein</span>
            </TabsTrigger>
          </TabsList>

          {/* Visual Branding Tab */}
          <TabsContent value="visual" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Logo Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    Logo
                  </CardTitle>
                  <CardDescription>
                    Uw bedrijfslogo wordt getoond in de navigatie en documenten
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.logoUrl ? (
                    <div className="relative group">
                      <div className="h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center p-4">
                        <img 
                          src={settings.logoUrl} 
                          alt="Bedrijfslogo" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => updateSettings({ ...settings, logoUrl: null })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <motion.div 
                      className="h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-muted/30 cursor-pointer"
                      whileHover={{ borderColor: "hsl(var(--primary))" }}
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Klik om logo te uploaden</span>
                    </motion.div>
                  )}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG of SVG • Aanbevolen: 400x100px • Max 2MB
                  </p>
                </CardContent>
              </Card>

              {/* Favicon Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Favicon
                  </CardTitle>
                  <CardDescription>
                    Het kleine icoontje dat in browser tabs wordt getoond
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.faviconUrl ? (
                    <div className="relative group inline-block">
                      <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center p-2">
                        <img 
                          src={settings.faviconUrl} 
                          alt="Favicon" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => updateSettings({ ...settings, faviconUrl: null })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <motion.div 
                      className="h-16 w-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center bg-muted/30 cursor-pointer"
                      whileHover={{ borderColor: "hsl(var(--primary))" }}
                      onClick={() => document.getElementById('favicon-upload')?.click()}
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </motion.div>
                  )}
                  <input
                    id="favicon-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFaviconUpload}
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG of ICO • Aanbevolen: 32x32px
                  </p>
                </CardContent>
              </Card>

              {/* Color Settings */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Kleuren
                  </CardTitle>
                  <CardDescription>
                    Pas de primaire en secundaire kleuren aan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Primaire Kleur</Label>
                      <div className="flex gap-3">
                        <Input
                          type="color"
                          value={settings.primaryColor || '#3b82f6'}
                          onChange={(e) => updateSettings({ ...settings, primaryColor: e.target.value })}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={settings.primaryColor || '#3b82f6'}
                          onChange={(e) => updateSettings({ ...settings, primaryColor: e.target.value })}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Gebruikt voor knoppen, links en accenten
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Secundaire Kleur</Label>
                      <div className="flex gap-3">
                        <Input
                          type="color"
                          value={settings.secondaryColor || '#10b981'}
                          onChange={(e) => updateSettings({ ...settings, secondaryColor: e.target.value })}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={settings.secondaryColor || '#10b981'}
                          onChange={(e) => updateSettings({ ...settings, secondaryColor: e.target.value })}
                          placeholder="#10b981"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Gebruikt voor succes-states en highlights
                      </p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <Label>Preview</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={previewMode === 'light' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPreviewMode('light')}
                        >
                          Light
                        </Button>
                        <Button
                          variant={previewMode === 'dark' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPreviewMode('dark')}
                        >
                          Dark
                        </Button>
                      </div>
                    </div>
                    <div 
                      className={`rounded-xl p-6 ${previewMode === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        {settings.logoUrl && (
                          <img src={settings.logoUrl} alt="Logo" className="h-8" />
                        )}
                        <div 
                          className="px-4 py-2 rounded-lg text-white font-medium"
                          style={{ backgroundColor: settings.primaryColor || '#3b82f6' }}
                        >
                          Primaire Knop
                        </div>
                        <div 
                          className="px-4 py-2 rounded-lg text-white font-medium"
                          style={{ backgroundColor: settings.secondaryColor || '#10b981' }}
                        >
                          Secundaire Knop
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Language Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Languages className="h-5 w-5 text-primary" />
                    Standaardtaal
                  </CardTitle>
                  <CardDescription>
                    De standaardtaal voor uw platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={settings.defaultLanguage || 'nl'}
                    onValueChange={(value) => updateSettings({ ...settings, defaultLanguage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nl">🇳🇱 Nederlands</SelectItem>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                      <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                      <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Document Branding
                </CardTitle>
                <CardDescription>
                  HTML headers en footers voor gegenereerde documenten (CMR, facturen, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Document Header (HTML)</Label>
                  <Textarea
                    value={settings.documentHeaderHtml || ''}
                    onChange={(e) => updateSettings({ ...settings, documentHeaderHtml: e.target.value })}
                    placeholder="<div style='text-align: center;'>{{company_name}}</div>"
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Beschikbare variabelen: {'{{company_name}}'}, {'{{company_address}}'}, {'{{date}}'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Document Footer (HTML)</Label>
                  <Textarea
                    value={settings.documentFooterHtml || ''}
                    onChange={(e) => updateSettings({ ...settings, documentFooterHtml: e.target.value })}
                    placeholder="<div style='font-size: 10px;'>KvK: {{kvk_number}} | BTW: {{vat_number}}</div>"
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portals Tab */}
          <TabsContent value="portals" className="space-y-6">
            <PortalBrandingTab
              settings={settings}
              onUpdate={updateSettings}
              onUploadPortalLogo={uploadPortalLogo}
            />
          </TabsContent>

          {/* Emails Tab */}
          <TabsContent value="emails" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  E-mail Branding
                </CardTitle>
                <CardDescription>
                  HTML headers en footers voor uitgaande e-mails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>E-mail Header (HTML)</Label>
                  <Textarea
                    value={settings.emailHeaderHtml || ''}
                    onChange={(e) => updateSettings({ ...settings, emailHeaderHtml: e.target.value })}
                    placeholder='<img src="{{logo_url}}" alt="Logo" style="height: 50px;"  alt="" />'
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail Footer (HTML)</Label>
                  <Textarea
                    value={settings.emailFooterHtml || ''}
                    onChange={(e) => updateSettings({ ...settings, emailFooterHtml: e.target.value })}
                    placeholder="<p>Met vriendelijke groet,<br/>{{company_name}}</p>"
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* E-mail Preview Section */}
            <EmailPreviewSection settings={settings} />
          </TabsContent>

          {/* Login Tab */}
          <TabsContent value="login" className="space-y-6">
            <LoginBrandingTab
              settings={settings}
              onUpdate={updateSettings}
              onUploadBackground={uploadLoginBackground}
            />
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social" className="space-y-6">
            <SocialMediaTab
              settings={settings}
              onUpdate={updateSettings}
            />
          </TabsContent>

          {/* Domain Tab */}
          <TabsContent value="domain" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Custom Domein
                </CardTitle>
                <CardDescription>
                  Gebruik uw eigen domein voor het platform (bijv. tms.uwbedrijf.nl)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Custom Domein</Label>
                  <Input
                    value={settings.customDomain || ''}
                    onChange={(e) => updateSettings({ ...settings, customDomain: e.target.value })}
                    placeholder="tms.uwbedrijf.nl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Neem contact op met support voor DNS configuratie
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="font-medium mb-2">DNS Configuratie</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Voeg de volgende CNAME record toe aan uw DNS:
                  </p>
                  <code className="block bg-background p-3 rounded text-sm">
                    CNAME {settings.customDomain || 'tms.uwbedrijf.nl'} → app.logiflow.nl
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default BrandingSettings;
