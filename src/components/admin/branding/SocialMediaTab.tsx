import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, Facebook, Linkedin, Instagram, Youtube } from 'lucide-react';
import { BrandingConfig } from '@/hooks/useBrandingSettings';

interface SocialMediaTabProps {
  settings: BrandingConfig;
  onUpdate: (settings: BrandingConfig) => void;
}

// X/Twitter icon as SVG component
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const SOCIAL_PLATFORMS = [
  { 
    key: 'facebook' as const, 
    name: 'Facebook', 
    icon: Facebook,
    placeholder: 'https://facebook.com/uwbedrijf',
    color: '#1877F2'
  },
  { 
    key: 'linkedin' as const, 
    name: 'LinkedIn', 
    icon: Linkedin,
    placeholder: 'https://linkedin.com/company/uwbedrijf',
    color: '#0A66C2'
  },
  { 
    key: 'instagram' as const, 
    name: 'Instagram', 
    icon: Instagram,
    placeholder: 'https://instagram.com/uwbedrijf',
    color: '#E4405F'
  },
  { 
    key: 'twitter' as const, 
    name: 'X (Twitter)', 
    icon: XIcon,
    placeholder: 'https://x.com/uwbedrijf',
    color: '#000000'
  },
  { 
    key: 'youtube' as const, 
    name: 'YouTube', 
    icon: Youtube,
    placeholder: 'https://youtube.com/@uwbedrijf',
    color: '#FF0000'
  },
];

const SocialMediaTab = ({ settings, onUpdate }: SocialMediaTabProps) => {
  const updateSocialLink = (platform: keyof typeof settings.socialLinks, value: string) => {
    onUpdate({
      ...settings,
      socialLinks: {
        ...settings.socialLinks,
        [platform]: value || null,
      },
    });
  };

  const filledCount = Object.values(settings.socialLinks).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          Social Media Links
        </CardTitle>
        <CardDescription>
          Voeg social media links toe die worden getoond in e-mails en het klantenportaal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map((platform) => {
            const Icon = platform.icon;
            const value = settings.socialLinks[platform.key] || '';
            
            return (
              <div key={platform.key} className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: platform.color }} />
                  {platform.name}
                </Label>
                <Input
                  type="url"
                  value={value}
                  onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                  placeholder={platform.placeholder}
                />
              </div>
            );
          })}
        </div>

        {/* Preview */}
        <div className="pt-6 border-t">
          <Label className="mb-3 block">Preview in footer</Label>
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center justify-center gap-4">
              {filledCount > 0 ? (
                SOCIAL_PLATFORMS.filter(p => settings.socialLinks[p.key]).map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <a
                      key={platform.key}
                      href={settings.socialLinks[platform.key] || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 w-10 rounded-full bg-background flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                      title={platform.name}
                    >
                      <Icon className="h-5 w-5" style={{ color: platform.color }} />
                    </a>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  Voeg links toe om de footer preview te zien
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {filledCount} van {SOCIAL_PLATFORMS.length} platforms geconfigureerd
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialMediaTab;
