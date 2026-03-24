import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Smartphone, 
  Truck, 
  CheckCircle, 
  MapPin,
  MessageSquare,
  Bell,
  Wifi,
  ChevronRight,
  Share,
  Plus,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallApp = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const features = [
    { icon: MapPin, label: 'Live GPS tracking', description: 'Deel je locatie automatisch' },
    { icon: Truck, label: 'Order management', description: 'Bekijk en update ritten' },
    { icon: MessageSquare, label: 'In-app chat', description: 'Communiceer met planners' },
    { icon: Bell, label: 'Push notificaties', description: 'Ontvang updates direct' },
    { icon: Wifi, label: 'Offline support', description: 'Werkt zonder internet' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">LogiFlow</h1>
              <p className="text-xs text-muted-foreground">Chauffeur App</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Smartphone className="w-3 h-3 mr-1" />
            Mobiele App
          </Badge>
          <h2 className="text-3xl font-display font-bold">
            Installeer LogiFlow
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Krijg toegang tot alle functies direct vanaf je startscherm. 
            Sneller, offline beschikbaar en met push notificaties.
          </p>
        </div>

        {/* Install Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6">
            {isInstalled ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-lg">App is geïnstalleerd!</p>
                  <p className="text-sm text-muted-foreground">
                    Open de app vanaf je startscherm
                  </p>
                </div>
                <Button onClick={() => navigate('/driver')} className="w-full">
                  Open Chauffeur Dashboard
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : isIOS ? (
              <div className="space-y-4">
                <p className="font-medium text-center">Installeren op iPhone/iPad:</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Share className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Stap 1</p>
                      <p className="text-xs text-muted-foreground">Tik op het Deel-icoon onderin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Stap 2</p>
                      <p className="text-xs text-muted-foreground">Kies "Zet op beginscherm"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Stap 3</p>
                      <p className="text-xs text-muted-foreground">Tik op "Voeg toe"</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : deferredPrompt ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
                  <Download className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Klaar om te installeren</p>
                  <p className="text-sm text-muted-foreground">
                    Voeg LogiFlow toe aan je startscherm
                  </p>
                </div>
                <Button onClick={handleInstall} size="lg" className="w-full h-12">
                  <Download className="w-5 h-5 mr-2" />
                  Installeer App
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Open deze pagina in Chrome of Edge om de app te installeren
                </p>
                <Button variant="outline" onClick={() => navigate('/driver')}>
                  Ga naar Chauffeur Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-center">App functies</h3>
          <div className="grid gap-3">
            {features.map((feature) => (
              <Card key={feature.label} className="bg-card/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Continue without installing */}
        <div className="text-center pt-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/driver')}
            className="text-muted-foreground"
          >
            Ga verder zonder installeren
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default InstallApp;
