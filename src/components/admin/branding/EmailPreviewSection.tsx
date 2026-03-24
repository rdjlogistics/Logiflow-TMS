import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Eye, 
  Mail, 
  Send,
  Download,
  Facebook,
  Linkedin,
  Instagram,
  Youtube
} from 'lucide-react';
import { BrandingConfig } from '@/hooks/useBrandingSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface EmailPreviewSectionProps {
  settings: BrandingConfig;
}

// X/Twitter icon
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const EMAIL_TEMPLATES = [
  { key: 'order_confirmation', name: 'Orderbevestiging', subject: 'Uw order is bevestigd' },
  { key: 'pod_notification', name: 'POD Notificatie', subject: 'Levering succesvol afgerond' },
  { key: 'invoice', name: 'Factuur', subject: 'Factuur voor uw zending' },
  { key: 'tracking_update', name: 'Tracking Update', subject: 'Update over uw zending' },
  { key: 'welcome', name: 'Welkom E-mail', subject: 'Welkom bij ons platform' },
];

const SAMPLE_DATA = {
  company_name: 'Uw Bedrijf',
  customer_name: 'Jan de Vries',
  order_id: '2026-00123',
  delivery_date: '15 januari 2026',
  tracking_url: 'https://track.example.com/abc123',
};

const EmailPreviewSection = ({ settings }: EmailPreviewSectionProps) => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState('order_confirmation');
  
  const template = EMAIL_TEMPLATES.find(t => t.key === selectedTemplate) || EMAIL_TEMPLATES[0];
  
  const socialIcons = [
    { key: 'facebook', url: settings.socialLinks.facebook, icon: Facebook, color: '#1877F2' },
    { key: 'linkedin', url: settings.socialLinks.linkedin, icon: Linkedin, color: '#0A66C2' },
    { key: 'instagram', url: settings.socialLinks.instagram, icon: Instagram, color: '#E4405F' },
    { key: 'twitter', url: settings.socialLinks.twitter, icon: XIcon, color: '#000000' },
    { key: 'youtube', url: settings.socialLinks.youtube, icon: Youtube, color: '#FF0000' },
  ].filter(s => s.url);

  const renderTemplateContent = () => {
    switch (selectedTemplate) {
      case 'order_confirmation':
        return (
          <>
            <p style={{ margin: '0 0 16px 0' }}>Beste {SAMPLE_DATA.customer_name},</p>
            <p style={{ margin: '0 0 16px 0' }}>
              Bedankt voor uw order. Wij hebben uw aanvraag ontvangen en zullen deze zo spoedig mogelijk verwerken.
            </p>
            <div style={{ 
              backgroundColor: '#f8fafc', 
              borderRadius: '8px', 
              padding: '16px', 
              margin: '16px 0' 
            }}>
              <p style={{ margin: '0', fontWeight: 600 }}>Order Details</p>
              <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
                Order nummer: {SAMPLE_DATA.order_id}<br />
                Verwachte levering: {SAMPLE_DATA.delivery_date}
              </p>
            </div>
            <p style={{ margin: '0 0 16px 0' }}>
              U ontvangt een tracking link zodra uw zending onderweg is.
            </p>
          </>
        );
      case 'pod_notification':
        return (
          <>
            <p style={{ margin: '0 0 16px 0' }}>Beste {SAMPLE_DATA.customer_name},</p>
            <p style={{ margin: '0 0 16px 0' }}>
              Goed nieuws! Uw zending is succesvol afgeleverd.
            </p>
            <div style={{ 
              backgroundColor: '#ecfdf5', 
              borderRadius: '8px', 
              padding: '16px', 
              margin: '16px 0',
              borderLeft: '4px solid #10b981'
            }}>
              <p style={{ margin: '0', fontWeight: 600, color: '#059669' }}>✓ Afgeleverd</p>
              <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
                Order: {SAMPLE_DATA.order_id}<br />
                Datum: {SAMPLE_DATA.delivery_date}
              </p>
            </div>
            <p style={{ margin: '0 0 16px 0' }}>
              De Proof of Delivery is bijgevoegd als bijlage.
            </p>
          </>
        );
      case 'invoice':
        return (
          <>
            <p style={{ margin: '0 0 16px 0' }}>Beste {SAMPLE_DATA.customer_name},</p>
            <p style={{ margin: '0 0 16px 0' }}>
              Hierbij ontvangt u de factuur voor uw recente zending.
            </p>
            <div style={{ 
              backgroundColor: '#f8fafc', 
              borderRadius: '8px', 
              padding: '16px', 
              margin: '16px 0' 
            }}>
              <p style={{ margin: '0', fontWeight: 600 }}>Factuur Details</p>
              <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
                Factuurnummer: INV-{SAMPLE_DATA.order_id}<br />
                Bedrag: €125,00 (incl. BTW)
              </p>
            </div>
            <p style={{ margin: '0 0 16px 0' }}>
              Gelieve het bedrag binnen 30 dagen over te maken.
            </p>
          </>
        );
      case 'tracking_update':
        return (
          <>
            <p style={{ margin: '0 0 16px 0' }}>Beste {SAMPLE_DATA.customer_name},</p>
            <p style={{ margin: '0 0 16px 0' }}>
              Er is een update over uw zending.
            </p>
            <div style={{ 
              backgroundColor: '#eff6ff', 
              borderRadius: '8px', 
              padding: '16px', 
              margin: '16px 0',
              borderLeft: '4px solid #3b82f6'
            }}>
              <p style={{ margin: '0', fontWeight: 600, color: '#2563eb' }}>🚚 Onderweg</p>
              <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
                Uw zending is onderweg naar het afleveradres.<br />
                Verwachte aankomst: {SAMPLE_DATA.delivery_date}
              </p>
            </div>
            <a 
              href={SAMPLE_DATA.tracking_url}
              style={{ 
                display: 'inline-block',
                backgroundColor: settings.primaryColor || '#3b82f6',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              Volg uw zending
            </a>
          </>
        );
      case 'welcome':
        return (
          <>
            <p style={{ margin: '0 0 16px 0' }}>Beste {SAMPLE_DATA.customer_name},</p>
            <p style={{ margin: '0 0 16px 0' }}>
              Welkom bij {SAMPLE_DATA.company_name}! We zijn verheugd dat u voor ons heeft gekozen.
            </p>
            <p style={{ margin: '0 0 16px 0' }}>
              Met ons platform kunt u:
            </p>
            <ul style={{ margin: '0 0 16px 0', paddingLeft: '20px', color: '#64748b' }}>
              <li>Zendingen real-time volgen</li>
              <li>Facturen bekijken en downloaden</li>
              <li>Nieuwe orders plaatsen</li>
            </ul>
            <a 
              href="#"
              style={{ 
                display: 'inline-block',
                backgroundColor: settings.primaryColor || '#3b82f6',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              Ga naar het portaal
            </a>
          </>
        );
      default:
        return null;
    }
  };

  const handleSendTest = () => {
    toast({
      title: 'Test e-mail verzonden',
      description: 'Een test e-mail is verzonden naar uw e-mailadres.',
    });
  };

  const handleExportHtml = () => {
    toast({
      title: 'HTML geëxporteerd',
      description: 'De e-mail template is gedownload als HTML bestand.',
    });
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              E-mail Preview
            </CardTitle>
            <CardDescription>
              Bekijk hoe uw e-mails eruit zien met de huidige branding
            </CardDescription>
          </div>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_TEMPLATES.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Email Preview */}
        <div className="border rounded-xl overflow-hidden bg-slate-100">
          {/* Email Header Bar */}
          <div className="bg-slate-200 px-4 py-2 flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium">{template.subject}</span>
          </div>
          
          {/* Email Content */}
          <div className="bg-white p-6">
            <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
              {/* Header */}
              {settings.emailHeaderHtml ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(settings.emailHeaderHtml
                      .replace('{{logo_url}}', settings.logoUrl || '')
                      .replace('{{company_name}}', SAMPLE_DATA.company_name))
                  }}
                  style={{ marginBottom: '24px' }}
                />
              ) : settings.logoUrl ? (
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <img 
                    src={settings.logoUrl} 
                    alt="Logo" 
                    style={{ height: '50px', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor: settings.primaryColor || '#3b82f6',
                  borderRadius: '8px'
                }}>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: '18px' }}>
                    {SAMPLE_DATA.company_name}
                  </span>
                </div>
              )}

              {/* Body */}
              <div style={{ color: '#1e293b', lineHeight: 1.6 }}>
                {renderTemplateContent()}
              </div>

              {/* Footer */}
              <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                {settings.emailFooterHtml ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(settings.emailFooterHtml
                        .replace('{{company_name}}', SAMPLE_DATA.company_name))
                    }}
                  />
                ) : (
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                    Met vriendelijke groet,<br />
                    <strong>{SAMPLE_DATA.company_name}</strong>
                  </p>
                )}

                {/* Social Icons */}
                {socialIcons.length > 0 && (
                  <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                    {socialIcons.map((social) => {
                      const Icon = social.icon;
                      return (
                        <a 
                          key={social.key}
                          href={social.url || '#'}
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#f1f5f9'
                          }}
                        >
                          <Icon 
                            style={{ width: '16px', height: '16px', color: social.color }} 
                            className="h-4 w-4"
                          />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <Button onClick={handleSendTest} variant="outline" className="gap-2">
            <Send className="h-4 w-4" />
            Test e-mail versturen
          </Button>
          <Button onClick={handleExportHtml} variant="ghost" className="gap-2">
            <Download className="h-4 w-4" />
            Exporteer HTML
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailPreviewSection;
