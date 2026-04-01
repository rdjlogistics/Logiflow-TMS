import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Cookie, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONSENT_STORAGE_KEY = 'logiflow_legal_consent';
const CONSENT_VERSION = '1.0.0';

interface LegalConsent {
  version: string;
  acceptedAt: string;
  privacyPolicy: boolean;
  termsOfService: boolean;
  cookiePolicy: boolean;
  dataProcessing: boolean;
  marketingOptIn?: boolean;
}

export function useLegalConsent() {
  const [consent, setConsent] = useState<LegalConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LegalConsent;
        if (parsed.version === CONSENT_VERSION) {
          setConsent(parsed);
        } else {
          setShowBanner(true);
        }
      } catch {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  const acceptConsent = (data: Omit<LegalConsent, 'version' | 'acceptedAt'>) => {
    const newConsent: LegalConsent = {
      ...data,
      version: CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);
  };

  const revokeConsent = () => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    setConsent(null);
    setShowBanner(true);
  };

  return { consent, showBanner, acceptConsent, revokeConsent };
}

export function LegalConsentBanner() {
  const { showBanner, acceptConsent } = useLegalConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [acceptances, setAcceptances] = useState({
    privacyPolicy: false,
    termsOfService: false,
    cookiePolicy: false,
    dataProcessing: false,
    marketingOptIn: false,
  });

  const allRequired = acceptances.privacyPolicy && 
    acceptances.termsOfService && 
    acceptances.cookiePolicy && 
    acceptances.dataProcessing;

  const handleAcceptAll = () => {
    acceptConsent({
      privacyPolicy: true,
      termsOfService: true,
      cookiePolicy: true,
      dataProcessing: true,
      marketingOptIn: true,
    });
  };

  const handleAcceptSelected = () => {
    if (!allRequired) return;
    acceptConsent(acceptances);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card/95 backdrop-blur-lg border-t shadow-lg animate-slide-up">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Privacy & Cookie Instellingen</h3>
              <p className="text-sm text-muted-foreground">
                Wij gebruiken cookies en verwerken persoonsgegevens conform de AVG/GDPR. 
                Door akkoord te gaan stemt u in met onze{' '}
                <button onClick={() => setShowDetails(true)} className="text-primary hover:underline">
                  privacyvoorwaarden
                </button>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>
              Instellingen
            </Button>
            <Button size="sm" onClick={handleAcceptAll}>
              Alles Accepteren
            </Button>
          </div>
        </div>
      </div>

      {/* Details dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy & Juridische Voorwaarden
            </DialogTitle>
            <DialogDescription>
              Om dit platform te gebruiken dient u akkoord te gaan met de volgende voorwaarden. 
              Dit is vereist conform de Europese AVG/GDPR wetgeving.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-6">
              {/* Privacy Policy */}
              <ConsentItem
                icon={Shield}
                title="Privacybeleid"
                description="Wij verwerken uw persoonsgegevens uitsluitend voor de uitvoering van onze diensten. Uw gegevens worden opgeslagen binnen de EU en niet gedeeld met derden zonder uw toestemming, tenzij wettelijk verplicht."
                required
                checked={acceptances.privacyPolicy}
                onCheckedChange={(checked) => 
                  setAcceptances(prev => ({ ...prev, privacyPolicy: checked === true }))
                }
              />

              {/* Terms of Service */}
              <ConsentItem
                icon={FileText}
                title="Algemene Voorwaarden"
                description="Door gebruik te maken van dit platform gaat u akkoord met onze algemene voorwaarden. Deze bevatten bepalingen over aansprakelijkheid, intellectueel eigendom en geschillenbeslechting."
                required
                checked={acceptances.termsOfService}
                onCheckedChange={(checked) => 
                  setAcceptances(prev => ({ ...prev, termsOfService: checked === true }))
                }
              />

              {/* Cookie Policy */}
              <ConsentItem
                icon={Cookie}
                title="Cookiebeleid"
                description="Wij gebruiken functionele cookies (noodzakelijk) en analytische cookies om de werking te verbeteren. Marketingcookies worden alleen geplaatst met uw expliciete toestemming."
                required
                checked={acceptances.cookiePolicy}
                onCheckedChange={(checked) => 
                  setAcceptances(prev => ({ ...prev, cookiePolicy: checked === true }))
                }
              />

              {/* Data Processing */}
              <ConsentItem
                icon={Shield}
                title="Gegevensverwerking"
                description="U geeft toestemming voor de verwerking van zakelijke gegevens (orders, ritten, facturen) ten behoeve van de logistieke dienstverlening. Gegevens worden 7 jaar bewaard conform fiscale verplichtingen."
                required
                checked={acceptances.dataProcessing}
                onCheckedChange={(checked) => 
                  setAcceptances(prev => ({ ...prev, dataProcessing: checked === true }))
                }
              />

              {/* Marketing (optional) */}
              <ConsentItem
                icon={FileText}
                title="Marketing & Updates"
                description="Ontvang updates over nieuwe functies, tips en aanbiedingen. U kunt zich altijd uitschrijven."
                checked={acceptances.marketingOptIn}
                onCheckedChange={(checked) => 
                  setAcceptances(prev => ({ ...prev, marketingOptIn: checked === true }))
                }
              />

              {/* Legal notices */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-xs text-muted-foreground">
                <p>
                  <strong>Rechtsgebied:</strong> Nederlands recht is van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter te Amsterdam.
                </p>
                <p>
                  <strong>Bewaartermijnen:</strong> Persoonsgegevens worden bewaard zolang noodzakelijk voor de dienstverlening, met een maximum van 7 jaar na beëindiging conform fiscale wetgeving.
                </p>
                <p>
                  <strong>Uw rechten:</strong> U heeft recht op inzage, rectificatie, verwijdering en overdraagbaarheid van uw gegevens. Neem contact op via privacy@logiflow.nl.
                </p>
              </div>
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t">
            <a 
              href="/legal/privacy" 
              target="_blank" 
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Volledige documenten bekijken
              <ExternalLink className="h-3 w-3" />
            </a>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleAcceptSelected}
                disabled={!allRequired}
              >
                Opslaan & Doorgaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ConsentItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  required?: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean | 'indeterminate') => void;
}

function ConsentItem({ 
  icon: Icon, 
  title, 
  description, 
  required, 
  checked, 
  onCheckedChange 
}: ConsentItemProps) {
  return (
    <div className={cn(
      "flex items-start gap-4 p-4 rounded-lg border",
      checked ? "bg-primary/5 border-primary/20" : "bg-card"
    )}>
      <Checkbox 
        id={title} 
        checked={checked} 
        onCheckedChange={onCheckedChange}
      />
      <div className="flex-1 space-y-1">
        <Label htmlFor={title} className="flex items-center gap-2 cursor-pointer">
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-medium">{title}</span>
          {required && (
            <span className="text-xs text-destructive">*verplicht</span>
          )}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
