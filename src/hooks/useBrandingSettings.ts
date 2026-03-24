import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useToast } from './use-toast';

export interface PortalBrandingConfig {
  primaryColor: string;
  logo: string | null;
  welcomeText: string | null;
}

export interface SocialLinks {
  facebook: string | null;
  linkedin: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
}

export interface FeatureHighlight {
  icon: string;
  title: string;
  description: string;
}

export interface LoginBranding {
  welcomeTitle: string;
  welcomeSubtitle: string;
  backgroundImageUrl: string | null;
  featureHighlights: FeatureHighlight[];
}

export interface PortalBranding {
  b2b: PortalBrandingConfig;
  b2c: PortalBrandingConfig;
  driver: PortalBrandingConfig;
}

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  customDomain: string | null;
  emailHeaderHtml: string | null;
  emailFooterHtml: string | null;
  documentHeaderHtml: string | null;
  documentFooterHtml: string | null;
  defaultLanguage: string;
  customCss?: string;
  showPoweredBy?: boolean;
  // New extended branding
  portalBranding: PortalBranding;
  socialLinks: SocialLinks;
  loginBranding: LoginBranding;
}

const DEFAULT_PORTAL_BRANDING: PortalBrandingConfig = {
  primaryColor: '#3b82f6',
  logo: null,
  welcomeText: null,
};

const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  facebook: null,
  linkedin: null,
  instagram: null,
  twitter: null,
  youtube: null,
};

const DEFAULT_LOGIN_BRANDING: LoginBranding = {
  welcomeTitle: 'Welkom',
  welcomeSubtitle: 'Premium Logistiek Platform',
  backgroundImageUrl: null,
  featureHighlights: [],
};

const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#3b82f6',
  secondaryColor: '#10b981',
  logoUrl: null,
  faviconUrl: null,
  customDomain: null,
  emailHeaderHtml: null,
  emailFooterHtml: null,
  documentHeaderHtml: null,
  documentFooterHtml: null,
  defaultLanguage: 'nl',
  showPoweredBy: true,
  portalBranding: {
    b2b: { ...DEFAULT_PORTAL_BRANDING },
    b2c: { ...DEFAULT_PORTAL_BRANDING },
    driver: { ...DEFAULT_PORTAL_BRANDING },
  },
  socialLinks: { ...DEFAULT_SOCIAL_LINKS },
  loginBranding: { ...DEFAULT_LOGIN_BRANDING },
};

export function useBrandingSettings() {
  const { company, updateCompany } = useCompany();
  const { toast } = useToast();
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      const config = (company as any).branding_config || {};
      const portalBranding = (company as any).portal_branding || {};
      const socialLinks = (company as any).social_links || {};
      const loginBranding = (company as any).login_branding || {};
      
      setBranding({
        primaryColor: (company as any).primary_color || DEFAULT_BRANDING.primaryColor,
        secondaryColor: (company as any).secondary_color || DEFAULT_BRANDING.secondaryColor,
        logoUrl: company.logo_url || null,
        faviconUrl: (company as any).favicon_url || null,
        customDomain: (company as any).custom_domain || null,
        emailHeaderHtml: (company as any).email_header_html || null,
        emailFooterHtml: (company as any).email_footer_html || null,
        documentHeaderHtml: (company as any).document_header_html || null,
        documentFooterHtml: (company as any).document_footer_html || null,
        defaultLanguage: (company as any).default_language || 'nl',
        customCss: config.customCss || '',
        showPoweredBy: config.showPoweredBy !== false,
        portalBranding: {
          b2b: { ...DEFAULT_PORTAL_BRANDING, ...portalBranding.b2b },
          b2c: { ...DEFAULT_PORTAL_BRANDING, ...portalBranding.b2c },
          driver: { ...DEFAULT_PORTAL_BRANDING, ...portalBranding.driver },
        },
        socialLinks: { ...DEFAULT_SOCIAL_LINKS, ...socialLinks },
        loginBranding: { ...DEFAULT_LOGIN_BRANDING, ...loginBranding },
      });
      setLoading(false);
    }
  }, [company]);

  const updateBranding = useCallback(async (updates: Partial<BrandingConfig>) => {
    if (!company) return false;

    setSaving(true);
    try {
      const { customCss, showPoweredBy, portalBranding, socialLinks, loginBranding, ...directFields } = updates;
      
      const dbUpdates: Record<string, any> = {};
      
      if (directFields.primaryColor !== undefined) dbUpdates.primary_color = directFields.primaryColor;
      if (directFields.secondaryColor !== undefined) dbUpdates.secondary_color = directFields.secondaryColor;
      if (directFields.logoUrl !== undefined) dbUpdates.logo_url = directFields.logoUrl;
      if (directFields.faviconUrl !== undefined) dbUpdates.favicon_url = directFields.faviconUrl;
      if (directFields.customDomain !== undefined) dbUpdates.custom_domain = directFields.customDomain;
      if (directFields.emailHeaderHtml !== undefined) dbUpdates.email_header_html = directFields.emailHeaderHtml;
      if (directFields.emailFooterHtml !== undefined) dbUpdates.email_footer_html = directFields.emailFooterHtml;
      if (directFields.documentHeaderHtml !== undefined) dbUpdates.document_header_html = directFields.documentHeaderHtml;
      if (directFields.documentFooterHtml !== undefined) dbUpdates.document_footer_html = directFields.documentFooterHtml;
      if (directFields.defaultLanguage !== undefined) dbUpdates.default_language = directFields.defaultLanguage;

      // Update branding_config jsonb for extended settings
      if (customCss !== undefined || showPoweredBy !== undefined) {
        const currentConfig = (company as any).branding_config || {};
        dbUpdates.branding_config = {
          ...currentConfig,
          ...(customCss !== undefined && { customCss }),
          ...(showPoweredBy !== undefined && { showPoweredBy }),
        };
      }

      // Update new JSONB columns
      if (portalBranding !== undefined) {
        dbUpdates.portal_branding = portalBranding;
      }
      if (socialLinks !== undefined) {
        dbUpdates.social_links = socialLinks;
      }
      if (loginBranding !== undefined) {
        dbUpdates.login_branding = loginBranding;
      }

      const { error } = await supabase
        .from('companies')
        .update(dbUpdates)
        .eq('id', company.id);

      if (error) throw error;

      setBranding(prev => ({ ...prev, ...updates }));
      toast({ title: 'Branding opgeslagen', description: 'De wijzigingen zijn succesvol opgeslagen.' });
      return true;
    } catch (err) {
      console.error('Error updating branding:', err);
      toast({ 
        title: 'Fout bij opslaan', 
        description: 'De branding kon niet worden opgeslagen.',
        variant: 'destructive' 
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [company, toast]);

  const uploadLogo = useCallback(async (file: File) => {
    if (!company) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      await updateBranding({ logoUrl: publicUrl });
      return publicUrl;
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast({ 
        title: 'Upload mislukt', 
        description: 'Het logo kon niet worden geüpload.',
        variant: 'destructive' 
      });
      return null;
    }
  }, [company, updateBranding, toast]);

  const uploadFavicon = useCallback(async (file: File) => {
    if (!company) return null;

    try {
      const fileName = `${company.id}/favicon.ico`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      await updateBranding({ faviconUrl: publicUrl });
      return publicUrl;
    } catch (err) {
      console.error('Error uploading favicon:', err);
      toast({ 
        title: 'Upload mislukt', 
        description: 'Het favicon kon niet worden geüpload.',
        variant: 'destructive' 
      });
      return null;
    }
  }, [company, updateBranding, toast]);

  const uploadPortalLogo = useCallback(async (portal: 'b2b' | 'b2c' | 'driver', file: File) => {
    if (!company) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}/portal-${portal}-logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      const newPortalBranding = {
        ...branding.portalBranding,
        [portal]: {
          ...branding.portalBranding[portal],
          logo: publicUrl,
        },
      };

      await updateBranding({ portalBranding: newPortalBranding });
      return publicUrl;
    } catch (err) {
      console.error('Error uploading portal logo:', err);
      toast({ 
        title: 'Upload mislukt', 
        description: 'Het portaal logo kon niet worden geüpload.',
        variant: 'destructive' 
      });
      return null;
    }
  }, [company, branding.portalBranding, updateBranding, toast]);

  const uploadLoginBackground = useCallback(async (file: File) => {
    if (!company) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}/login-background.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      const newLoginBranding = {
        ...branding.loginBranding,
        backgroundImageUrl: publicUrl,
      };

      await updateBranding({ loginBranding: newLoginBranding });
      return publicUrl;
    } catch (err) {
      console.error('Error uploading login background:', err);
      toast({ 
        title: 'Upload mislukt', 
        description: 'De achtergrondafbeelding kon niet worden geüpload.',
        variant: 'destructive' 
      });
      return null;
    }
  }, [company, branding.loginBranding, updateBranding, toast]);

  return {
    branding,
    loading,
    saving,
    updateBranding,
    uploadLogo,
    uploadFavicon,
    uploadPortalLogo,
    uploadLoginBackground,
  };
}
