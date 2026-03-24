import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, Euro, Calendar, CheckCircle, AlertTriangle, 
  Settings, Save
} from "lucide-react";
import { useRelationshipVault } from "@/hooks/useRelationshipVault";
import type { Json } from "@/integrations/supabase/types";

const GiftPolicy = () => {
  const { giftPolicy, upsertGiftPolicy, giftOrders, vendorAdapters } = useRelationshipVault();
  
  const [formData, setFormData] = useState({
    max_amount_per_gift: 100,
    max_amount_per_month_per_account: 250,
    requires_approval_over_amount: 50,
    allowed_categories_json: ['FLOWERS', 'FRUIT', 'CAKE', 'GIFT_CARD', 'OTHER'] as string[],
  });

  useEffect(() => {
    if (giftPolicy) {
      setFormData({
        max_amount_per_gift: giftPolicy.max_amount_per_gift,
        max_amount_per_month_per_account: giftPolicy.max_amount_per_month_per_account,
        requires_approval_over_amount: giftPolicy.requires_approval_over_amount,
        allowed_categories_json: Array.isArray(giftPolicy.allowed_categories_json) 
          ? giftPolicy.allowed_categories_json as string[]
          : ['FLOWERS', 'FRUIT', 'CAKE', 'GIFT_CARD', 'OTHER'],
      });
    }
  }, [giftPolicy]);

  const handleSave = async () => {
    await upsertGiftPolicy.mutateAsync({
      max_amount_per_gift: formData.max_amount_per_gift,
      max_amount_per_month_per_account: formData.max_amount_per_month_per_account,
      requires_approval_over_amount: formData.requires_approval_over_amount,
      allowed_categories_json: formData.allowed_categories_json as unknown as Json,
    });
  };

  const categoryOptions = [
    { key: 'FLOWERS', label: 'Bloemen' },
    { key: 'FRUIT', label: 'Fruit' },
    { key: 'CAKE', label: 'Taart' },
    { key: 'GIFT_CARD', label: 'Cadeaubon' },
    { key: 'OTHER', label: 'Anders' },
  ];

  const toggleCategory = (cat: string) => {
    const current = formData.allowed_categories_json;
    if (current.includes(cat)) {
      setFormData({ ...formData, allowed_categories_json: current.filter(c => c !== cat) });
    } else {
      setFormData({ ...formData, allowed_categories_json: [...current, cat] });
    }
  };

  // Calculate monthly stats
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const monthlyOrders = giftOrders.filter(o => 
    new Date(o.created_at) >= monthStart && o.status !== 'CANCELLED'
  );
  const monthlySpend = monthlyOrders.reduce((sum, o) => sum + Number(o.budget_amount), 0);

  return (
    <DashboardLayout title="Gift Policy">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Gift Policy
            </h1>
            <p className="text-muted-foreground mt-1">
              Beheer budgetten, limieten en goedkeuringsregels voor cadeaus
            </p>
          </div>
          <Button onClick={handleSave} disabled={upsertGiftPolicy.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {upsertGiftPolicy.isPending ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Deze maand uitgegeven</p>
                  <p className="text-2xl font-bold">€{monthlySpend.toFixed(2)}</p>
                </div>
                <Euro className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cadeaus deze maand</p>
                  <p className="text-2xl font-bold">{monthlyOrders.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Wachtend op goedkeuring</p>
                  <p className="text-2xl font-bold text-amber-500">
                    {giftOrders.filter(o => o.status === 'APPROVAL_PENDING').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Actieve adapters</p>
                  <p className="text-2xl font-bold">
                    {vendorAdapters.filter(a => a.status === 'ENABLED').length}
                  </p>
                </div>
                <Settings className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Budget Limieten
              </CardTitle>
              <CardDescription>
                Stel maximale bedragen in voor cadeaus
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Maximum per cadeau (€)</Label>
                <Input 
                  type="number"
                  value={formData.max_amount_per_gift}
                  onChange={(e) => setFormData({ ...formData, max_amount_per_gift: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Cadeaus boven dit bedrag worden geblokkeerd
                </p>
              </div>
              
              <div>
                <Label>Maximum per maand per klant (€)</Label>
                <Input 
                  type="number"
                  value={formData.max_amount_per_month_per_account}
                  onChange={(e) => setFormData({ ...formData, max_amount_per_month_per_account: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Totaal budget per klant per maand
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Approval Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Goedkeuringsregels
              </CardTitle>
              <CardDescription>
                Wanneer is goedkeuring vereist?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Goedkeuring vereist boven (€)</Label>
                <Input 
                  type="number"
                  value={formData.requires_approval_over_amount}
                  onChange={(e) => setFormData({ ...formData, requires_approval_over_amount: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Cadeaus boven dit bedrag vereisen goedkeuring van een manager
                </p>
              </div>

              <Separator />

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Goedkeuringsflow</h4>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">1</span>
                    Medewerker maakt cadeau aan
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">2</span>
                    Als bedrag &gt; €{formData.requires_approval_over_amount}: status wordt "Wacht op goedkeuring"
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">3</span>
                    Manager keurt goed of wijst af
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">4</span>
                    Bij goedkeuring: cadeau kan besteld worden
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Allowed Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Toegestane Categorieën</CardTitle>
              <CardDescription>
                Welke soorten cadeaus mogen verstuurd worden?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map(cat => (
                  <Badge 
                    key={cat.key}
                    variant={formData.allowed_categories_json.includes(cat.key) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCategory(cat.key)}
                  >
                    {formData.allowed_categories_json.includes(cat.key) && (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    {cat.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vendor Adapters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Leverancier Adapters
              </CardTitle>
              <CardDescription>
                Configureer connecties met cadeauleveranciers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {vendorAdapters.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Geen adapters geconfigureerd</p>
                  <p className="text-sm mt-1">Standaard: handmatige bestelling via vendor portal</p>
                </div>
              ) : (
                vendorAdapters.map(adapter => (
                  <div key={adapter.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{adapter.vendor}</p>
                      <p className="text-sm text-muted-foreground">
                        Mode: {adapter.mode}
                        {adapter.portal_url && ` • ${adapter.portal_url}`}
                      </p>
                    </div>
                    <Badge variant={adapter.status === 'ENABLED' ? 'default' : 'secondary'}>
                      {adapter.status}
                    </Badge>
                  </div>
                ))
              )}
              
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Standaard adapters:</strong>
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Topbloemen: Portal (topbloemen.nl/zakelijk)</li>
                  <li>• Fleurop: Portal (fleurop.nl/zakelijk)</li>
                  <li>• API integratie: op aanvraag</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GiftPolicy;
