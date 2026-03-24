import B2CLayout from "@/components/portal/b2c/B2CLayout";
import { 
  HelpCircle, 
  MessageCircle, 
  Phone, 
  Mail,
  ChevronRight,
  FileText,
  Package,
  Clock,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    icon: Package,
    question: "Hoe volg ik mijn pakket?",
    answer: "Ga naar 'Zendingen' en klik op je pakket om de realtime status te zien.",
  },
  {
    icon: Clock,
    question: "Kan ik het bezorgmoment wijzigen?",
    answer: "Ja, klik op je zending en selecteer 'Bezorging wijzigen'.",
  },
  {
    icon: MapPin,
    question: "Wat als ik niet thuis ben?",
    answer: "Je kunt een alternatief afleveradres of buren opgeven.",
  },
  {
    icon: FileText,
    question: "Waar vind ik mijn facturen?",
    answer: "Ga naar 'Account' > 'Facturen' voor al je facturen.",
  },
];

const B2CHelp = () => {
  return (
    <B2CLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Hulp nodig?</h1>
          <p className="text-sm text-muted-foreground">We helpen je graag verder</p>
        </div>

        {/* Contact Options */}
        <div className="grid gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Live Chat</p>
                  <p className="text-xs text-muted-foreground">Direct antwoord van ons team</p>
                </div>
                <Button size="sm" className="bg-gold hover:bg-gold/90 text-gold-foreground">
                  Start
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Phone className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Bel ons</p>
                  <p className="text-xs text-muted-foreground">Ma-Vr 9:00 - 17:00</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="tel:+31201234567">088-1234567</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Mail className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">E-mail</p>
                  <p className="text-xs text-muted-foreground">Antwoord binnen 24 uur</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="mailto:support@logiflow.nl">Stuur</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Veelgestelde vragen
          </h2>
          
          {faqs.map((faq, index) => (
            <Card key={index} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <faq.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{faq.question}</p>
                    <p className="text-xs text-muted-foreground mt-1">{faq.answer}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </B2CLayout>
  );
};

export default B2CHelp;
