import { ArrowLeft, Shield, Mail, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
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
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Privacybeleid</h1>
            </div>
            <p className="text-muted-foreground">
              Laatst bijgewerkt: {lastUpdated}
            </p>
          </div>

          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle>1. Inleiding</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                LogiFlow ("wij", "ons", "onze") respecteert uw privacy en is toegewijd aan de bescherming 
                van uw persoonsgegevens. Dit privacybeleid informeert u over hoe wij omgaan met uw 
                persoonsgegevens wanneer u onze diensten gebruikt.
              </p>
              <p>
                Dit beleid is van toepassing op alle gebruikers van het LogiFlow platform, inclusief 
                transportbedrijven, chauffeurs, klanten en andere zakelijke relaties.
              </p>
            </CardContent>
          </Card>

          {/* Data Controller */}
          <Card>
            <CardHeader>
              <CardTitle>2. Verwerkingsverantwoordelijke</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">LogiFlow B.V.</p>
                  <p className="text-sm text-muted-foreground">
                    Geregistreerd bij de Kamer van Koophandel<br />
                    Onderworpen aan Nederlands recht
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Functionaris Gegevensbescherming</p>
                  <p className="text-sm text-muted-foreground">
                    Email: privacy@logiflow.nl
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Collection */}
          <Card>
            <CardHeader>
              <CardTitle>3. Gegevens die wij verzamelen</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <h4>Identiteitsgegevens</h4>
              <ul>
                <li>Naam, emailadres, telefoonnummer</li>
                <li>Bedrijfsnaam, KvK-nummer, BTW-nummer</li>
                <li>Functie en rol binnen de organisatie</li>
              </ul>

              <h4>Operationele gegevens</h4>
              <ul>
                <li>Ordergegevens en transportopdrachten</li>
                <li>Locatiegegevens van voertuigen (tijdens transport)</li>
                <li>Aflever- en ophaaladressen</li>
                <li>Factuur- en betalingsgegevens</li>
              </ul>

              <h4>Technische gegevens</h4>
              <ul>
                <li>IP-adres en apparaatgegevens</li>
                <li>Browsertype en -versie</li>
                <li>Gebruiksstatistieken en voorkeuren</li>
              </ul>

              <h4>Documenten</h4>
              <ul>
                <li>Identiteitsbewijzen (chauffeurs)</li>
                <li>Rijbewijzen en certificaten</li>
                <li>Ondertekende contracten en overeenkomsten</li>
                <li>Proof of Delivery (afleverbewijzen)</li>
              </ul>
            </CardContent>
          </Card>

          {/* Legal Basis */}
          <Card>
            <CardHeader>
              <CardTitle>4. Rechtsgronden voor verwerking</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>Wij verwerken uw gegevens op basis van:</p>
              <ul>
                <li>
                  <strong>Uitvoering van de overeenkomst:</strong> Om onze logistieke diensten te leveren
                </li>
                <li>
                  <strong>Wettelijke verplichting:</strong> Fiscale bewaarplicht, transportwetgeving
                </li>
                <li>
                  <strong>Gerechtvaardigd belang:</strong> Beveiliging, fraudepreventie, verbetering diensten
                </li>
                <li>
                  <strong>Toestemming:</strong> Marketing en niet-essentiële cookies (indien gegeven)
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle>5. Bewaartermijnen</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th>Gegevenstype</th>
                    <th>Bewaartermijn</th>
                    <th>Grondslag</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Facturen en financiële gegevens</td>
                    <td>7 jaar</td>
                    <td>Fiscale wetgeving (AWR art. 52)</td>
                  </tr>
                  <tr>
                    <td>Contracten en overeenkomsten</td>
                    <td>7 jaar na beëindiging</td>
                    <td>Wettelijke bewaartermijn</td>
                  </tr>
                  <tr>
                    <td>Transportdocumenten</td>
                    <td>5 jaar</td>
                    <td>CMR-verdrag</td>
                  </tr>
                  <tr>
                    <td>Locatiegegevens</td>
                    <td>90 dagen</td>
                    <td>Operationele noodzaak</td>
                  </tr>
                  <tr>
                    <td>Accountgegevens</td>
                    <td>Tot 1 jaar na beëindiging</td>
                    <td>Dienstverlening</td>
                  </tr>
                  <tr>
                    <td>Audit logs</td>
                    <td>10 jaar</td>
                    <td>Bewijsvoering</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle>6. Uw rechten</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>Op grond van de AVG heeft u de volgende rechten:</p>
              <ul>
                <li><strong>Recht op inzage:</strong> U kunt opvragen welke gegevens wij van u verwerken</li>
                <li><strong>Recht op rectificatie:</strong> U kunt onjuiste gegevens laten corrigeren</li>
                <li><strong>Recht op vergetelheid:</strong> U kunt in bepaalde gevallen verwijdering verzoeken</li>
                <li><strong>Recht op beperking:</strong> U kunt de verwerking laten beperken</li>
                <li><strong>Recht op overdraagbaarheid:</strong> U kunt uw gegevens in een standaardformaat ontvangen</li>
                <li><strong>Recht van bezwaar:</strong> U kunt bezwaar maken tegen verwerking op basis van gerechtvaardigd belang</li>
              </ul>
              <p>
                Verzoeken kunt u indienen via <a href="mailto:privacy@logiflow.nl">privacy@logiflow.nl</a>. 
                Wij reageren binnen 30 dagen.
              </p>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>7. Beveiliging</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>Wij hebben passende technische en organisatorische maatregelen getroffen:</p>
              <ul>
                <li>Versleuteling van data in rust en tijdens transport (TLS 1.3)</li>
                <li>Multi-tenant isolatie met Row Level Security</li>
                <li>Regelmatige beveiligingsaudits en penetratietests</li>
                <li>Toegangscontrole op basis van rollen (RBAC)</li>
                <li>Automatische back-ups met geografische spreiding</li>
                <li>24/7 monitoring op beveiligingsincidenten</li>
              </ul>
            </CardContent>
          </Card>

          {/* International Transfers */}
          <Card>
            <CardHeader>
              <CardTitle>8. Internationale doorgifte</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Uw gegevens worden primair verwerkt binnen de Europese Economische Ruimte (EER). 
                Indien doorgifte naar derde landen noodzakelijk is, zorgen wij voor passende 
                waarborgen conform Hoofdstuk V van de AVG, zoals:
              </p>
              <ul>
                <li>EU Standard Contractual Clauses (SCC)</li>
                <li>Adequaatheidsbesluiten van de Europese Commissie</li>
              </ul>
            </CardContent>
          </Card>

          {/* Complaints */}
          <Card>
            <CardHeader>
              <CardTitle>9. Klachten</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Heeft u een klacht over onze gegevensverwerking? Neem dan contact met ons op via 
                <a href="mailto:privacy@logiflow.nl"> privacy@logiflow.nl</a>. 
                U heeft ook het recht om een klacht in te dienen bij de Autoriteit Persoonsgegevens:
              </p>
              <p className="text-sm text-muted-foreground">
                Autoriteit Persoonsgegevens<br />
                Postbus 93374<br />
                2509 AJ DEN HAAG<br />
                www.autoriteitpersoonsgegevens.nl
              </p>
            </CardContent>
          </Card>

          {/* Updates */}
          <Card>
            <CardHeader>
              <CardTitle>10. Wijzigingen</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Dit privacybeleid kan worden gewijzigd. Materiële wijzigingen worden 30 dagen 
                vooraf aangekondigd via email en/of een melding in de applicatie. De meest 
                recente versie is altijd beschikbaar op deze pagina.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
