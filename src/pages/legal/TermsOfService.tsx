import { ArrowLeft, FileText, Scale, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();
  const lastUpdated = '10 januari 2026';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>

        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Algemene Voorwaarden</h1>
            </div>
            <p className="text-muted-foreground">
              Laatst bijgewerkt: {lastUpdated}
            </p>
          </div>

          {/* Applicability */}
          <Card>
            <CardHeader>
              <CardTitle>1. Toepasselijkheid</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Deze algemene voorwaarden zijn van toepassing op alle diensten die LogiFlow B.V. 
                ("LogiFlow", "wij", "ons") levert via het LogiFlow platform, inclusief maar niet 
                beperkt tot:
              </p>
              <ul>
                <li>Transport Management Systeem (TMS) functionaliteiten</li>
                <li>Orderverwerking en ritplanning</li>
                <li>Tracking & tracing diensten</li>
                <li>Facturatie en financiële rapportages</li>
                <li>Klant- en chauffeurportalen</li>
                <li>API-integraties</li>
              </ul>
              <p>
                Door gebruik te maken van onze diensten, accepteert u deze voorwaarden. Indien u 
                niet akkoord gaat, dient u het gebruik van onze diensten te staken.
              </p>
            </CardContent>
          </Card>

          {/* Definitions */}
          <Card>
            <CardHeader>
              <CardTitle>2. Definities</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <ul>
                <li><strong>Platform:</strong> Het LogiFlow webapplicatie en alle gerelateerde diensten</li>
                <li><strong>Gebruiker:</strong> Elke natuurlijke of rechtspersoon die toegang heeft tot het Platform</li>
                <li><strong>Tenant:</strong> Een organisatie (transportbedrijf) met een account op het Platform</li>
                <li><strong>Eindgebruiker:</strong> Chauffeurs, klanten en andere personen die via de Tenant toegang krijgen</li>
                <li><strong>Content:</strong> Alle gegevens, documenten en informatie verwerkt via het Platform</li>
              </ul>
            </CardContent>
          </Card>

          {/* Service Description */}
          <Card>
            <CardHeader>
              <CardTitle>3. Dienstverlening</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <h4>3.1 Beschikbaarheid</h4>
              <p>
                LogiFlow streeft naar een beschikbaarheid van 99,5% op jaarbasis, exclusief 
                gepland onderhoud. Gepland onderhoud wordt minimaal 48 uur vooraf aangekondigd.
              </p>
              
              <h4>3.2 Support</h4>
              <p>
                Support is beschikbaar tijdens kantooruren (ma-vr 09:00-17:00 CET). 
                Kritieke storingen worden 24/7 behandeld voor Premium abonnementen.
              </p>

              <h4>3.3 Updates</h4>
              <p>
                LogiFlow kan het Platform wijzigen en verbeteren. Materiële wijzigingen die de 
                functionaliteit beïnvloeden worden vooraf gecommuniceerd.
              </p>
            </CardContent>
          </Card>

          {/* User Obligations */}
          <Card>
            <CardHeader>
              <CardTitle>4. Verplichtingen Gebruiker</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>De Gebruiker verbindt zich om:</p>
              <ul>
                <li>Correcte en actuele informatie te verstrekken</li>
                <li>Inloggegevens vertrouwelijk te houden</li>
                <li>Het Platform niet te gebruiken voor onrechtmatige doeleinden</li>
                <li>Geen handelingen te verrichten die de werking van het Platform verstoren</li>
                <li>Toepasselijke wet- en regelgeving na te leven (incl. transportwetgeving)</li>
                <li>Toestemming te hebben voor het verwerken van persoonsgegevens van derden</li>
              </ul>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card>
            <CardHeader>
              <CardTitle>5. Intellectueel Eigendom</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Alle intellectuele eigendomsrechten op het Platform, inclusief software, 
                ontwerp, teksten en logo's, berusten bij LogiFlow of haar licentiegevers.
              </p>
              <p>
                De Gebruiker verkrijgt een niet-exclusief, niet-overdraagbaar gebruiksrecht 
                voor de duur van de overeenkomst.
              </p>
              <p>
                Content die door de Gebruiker wordt geüpload blijft eigendom van de Gebruiker. 
                De Gebruiker verleent LogiFlow een licentie om deze Content te verwerken voor 
                de uitvoering van de diensten.
              </p>
            </CardContent>
          </Card>

          {/* Liability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                6. Aansprakelijkheid
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Belangrijke bepaling
                </div>
              </div>

              <h4>6.1 Beperking aansprakelijkheid</h4>
              <p>
                De totale aansprakelijkheid van LogiFlow is beperkt tot het bedrag van de door 
                de Gebruiker betaalde vergoedingen in de 12 maanden voorafgaand aan de 
                schadeveroorzakende gebeurtenis, met een maximum van €100.000.
              </p>

              <h4>6.2 Uitsluiting</h4>
              <p>LogiFlow is niet aansprakelijk voor:</p>
              <ul>
                <li>Indirecte schade, waaronder gederfde winst, gemiste besparingen</li>
                <li>Schade door onjuiste of onvolledige gegevens aangeleverd door Gebruiker</li>
                <li>Schade door ongeautoriseerd gebruik van inloggegevens</li>
                <li>Schade door storingen bij derden (internet, hosting)</li>
                <li>Schade door overmacht</li>
              </ul>

              <h4>6.3 Vrijwaring</h4>
              <p>
                De Gebruiker vrijwaart LogiFlow tegen aanspraken van derden die voortvloeien 
                uit schending van deze voorwaarden of het gebruik van het Platform.
              </p>
            </CardContent>
          </Card>

          {/* Data Processing */}
          <Card>
            <CardHeader>
              <CardTitle>7. Gegevensverwerking</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Voor de verwerking van persoonsgegevens verwijzen wij naar ons{' '}
                <a href="/legal/privacy">Privacybeleid</a>. 
                Waar LogiFlow als verwerker optreedt, geldt een separate 
                Verwerkersovereenkomst conform artikel 28 AVG.
              </p>
              <p>
                De Gebruiker is verantwoordelijk voor de rechtmatigheid van de gegevens die 
                via het Platform worden verwerkt en garandeert over de vereiste toestemmingen 
                of andere grondslagen te beschikken.
              </p>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle>8. Beëindiging</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <h4>8.1 Opzegging</h4>
              <p>
                Beide partijen kunnen de overeenkomst opzeggen met inachtneming van een 
                opzegtermijn van 30 dagen, tegen het einde van een maand.
              </p>

              <h4>8.2 Ontbinding</h4>
              <p>
                LogiFlow kan de overeenkomst met onmiddellijke ingang ontbinden bij:
              </p>
              <ul>
                <li>Materiële schending van deze voorwaarden</li>
                <li>Faillissement of surseance van betaling van Gebruiker</li>
                <li>Gebruik van het Platform voor illegale doeleinden</li>
              </ul>

              <h4>8.3 Gevolgen beëindiging</h4>
              <p>
                Na beëindiging kan de Gebruiker gedurende 30 dagen zijn gegevens exporteren. 
                Daarna worden gegevens verwijderd, behoudens wettelijke bewaartermijnen.
              </p>
            </CardContent>
          </Card>

          {/* Dispute Resolution */}
          <Card>
            <CardHeader>
              <CardTitle>9. Geschillenbeslechting</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Op deze voorwaarden is Nederlands recht van toepassing. Het Weens Koopverdrag 
                (CISG) is uitgesloten.
              </p>
              <p>
                Geschillen worden in eerste instantie voorgelegd aan de bevoegde rechter te 
                Amsterdam. Partijen zullen eerst trachten geschillen in onderling overleg 
                op te lossen.
              </p>
              <p>
                Voor consumenten gelden afwijkende regels conform Europese consumentenwetgeving. 
                Consumenten kunnen geschillen ook voorleggen aan het Europees ODR-platform: 
                <a href="https://ec.europa.eu/odr" target="_blank" rel="noopener noreferrer">
                  ec.europa.eu/odr
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Final Provisions */}
          <Card>
            <CardHeader>
              <CardTitle>10. Slotbepalingen</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <ul>
                <li>
                  <strong>Nietigheid:</strong> Indien een bepaling nietig of vernietigbaar is, 
                  blijven de overige bepalingen van kracht.
                </li>
                <li>
                  <strong>Overdracht:</strong> Gebruiker kan rechten en verplichtingen niet 
                  overdragen zonder schriftelijke toestemming van LogiFlow.
                </li>
                <li>
                  <strong>Wijzigingen:</strong> LogiFlow kan deze voorwaarden wijzigen. 
                  Materiële wijzigingen worden 30 dagen vooraf aangekondigd.
                </li>
                <li>
                  <strong>Volledige overeenkomst:</strong> Deze voorwaarden vormen samen met 
                  het Privacybeleid en eventuele bijlagen de volledige overeenkomst.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
