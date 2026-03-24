import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Gift, Plus, Package, Truck, CheckCircle, XCircle, 
  Clock, AlertTriangle, ExternalLink, FileText, Flower2, Apple,
  Cake, CreditCard, Box, CalendarIcon, MapPin, Sparkles
} from "lucide-react";
import { useRelationshipVault, GiftCategory, GiftVendor, GiftStatus, GiftOrder } from "@/hooks/useRelationshipVault";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

const categoryConfig: Record<GiftCategory, { label: string; icon: React.ReactNode }> = {
  FLOWERS: { label: 'Bloemen', icon: <Flower2 className="h-4 w-4" /> },
  FRUIT: { label: 'Fruit', icon: <Apple className="h-4 w-4" /> },
  CAKE: { label: 'Taart', icon: <Cake className="h-4 w-4" /> },
  GIFT_CARD: { label: 'Cadeaubon', icon: <CreditCard className="h-4 w-4" /> },
  OTHER: { label: 'Anders', icon: <Box className="h-4 w-4" /> },
};

const vendorConfig: Record<GiftVendor, { label: string; portalUrl: string }> = {
  TOPBLOEMEN: { label: 'Topbloemen', portalUrl: 'https://www.topbloemen.nl/zakelijk' },
  FLEUROP: { label: 'Fleurop', portalUrl: 'https://www.fleurop.nl/zakelijk' },
  OTHER: { label: 'Anders', portalUrl: '' },
};

const statusConfig: Record<GiftStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Concept', color: 'bg-muted text-muted-foreground', icon: <FileText className="h-3 w-3" /> },
  APPROVAL_PENDING: { label: 'Wacht op goedkeuring', color: 'bg-amber-500/10 text-amber-500', icon: <Clock className="h-3 w-3" /> },
  ORDERED: { label: 'Besteld', color: 'bg-blue-500/10 text-blue-500', icon: <Package className="h-3 w-3" /> },
  SENT: { label: 'Verzonden', color: 'bg-violet-500/10 text-violet-500', icon: <Truck className="h-3 w-3" /> },
  DELIVERED: { label: 'Afgeleverd', color: 'bg-emerald-500/10 text-emerald-500', icon: <CheckCircle className="h-3 w-3" /> },
  CANCELLED: { label: 'Geannuleerd', color: 'bg-muted text-muted-foreground', icon: <XCircle className="h-3 w-3" /> },
  FAILED: { label: 'Mislukt', color: 'bg-destructive/10 text-destructive', icon: <AlertTriangle className="h-3 w-3" /> },
};

const GiftCenter = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  
  // Wizard form state
  const [newOrder, setNewOrder] = useState({
    account_id: '',
    category: 'FLOWERS' as GiftCategory,
    vendor: 'TOPBLOEMEN' as GiftVendor,
    budget_amount: 50,
    delivery_name: '',
    delivery_address_json: { street: '', city: '', postal_code: '' },
    delivery_date: new Date(),
    message_card_text: '',
    internal_reason: '',
    fulfillment_mode: 'VENDOR_PORTAL' as const,
  });
  
  const { 
    giftOrders, 
    ordersLoading, 
    createGiftOrder,
    updateGiftOrder,
    giftPolicy,
    validateGiftAgainstPolicy,
    createGiftApproval,
  } = useRelationshipVault();

  // Get customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-gifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, email, city, address');
      if (error) throw error;
      return data;
    },
  });

  const getCustomerName = (accountId: string) => 
    customers.find(c => c.id === accountId)?.company_name || 'Onbekend';

  const filteredOrders = giftOrders.filter(o => 
    statusFilter === "all" || o.status === statusFilter
  );

  const handleCreateOrder = async () => {
    // Validate against policy
    const validation = validateGiftAgainstPolicy(newOrder.budget_amount, newOrder.account_id);
    
    if (!validation.valid) {
      toast.error(validation.reason);
      return;
    }
    
    const order = await createGiftOrder.mutateAsync({
      account_id: newOrder.account_id,
      category: newOrder.category,
      vendor: newOrder.vendor,
      budget_amount: newOrder.budget_amount,
      delivery_name: newOrder.delivery_name,
      delivery_address_json: newOrder.delivery_address_json as unknown as Json,
      delivery_date: format(newOrder.delivery_date, 'yyyy-MM-dd'),
      message_card_text: newOrder.message_card_text,
      internal_reason: newOrder.internal_reason,
      fulfillment_mode: newOrder.fulfillment_mode,
      status: validation.needsApproval ? 'APPROVAL_PENDING' : 'DRAFT',
    });
    
    if (validation.needsApproval && order) {
      await createGiftApproval.mutateAsync(order.id);
      toast.info('Dit cadeau vereist goedkeuring');
    }
    
    setWizardOpen(false);
    setWizardStep(1);
    setNewOrder({
      account_id: '',
      category: 'FLOWERS',
      vendor: 'TOPBLOEMEN',
      budget_amount: 50,
      delivery_name: '',
      delivery_address_json: { street: '', city: '', postal_code: '' },
      delivery_date: new Date(),
      message_card_text: '',
      internal_reason: '',
      fulfillment_mode: 'VENDOR_PORTAL',
    });
  };

  const handleMarkOrdered = async (orderId: string) => {
    await updateGiftOrder.mutateAsync({ id: orderId, status: 'ORDERED' });
  };

  const handleMarkDelivered = async (orderId: string) => {
    await updateGiftOrder.mutateAsync({ id: orderId, status: 'DELIVERED' });
  };

  return (
    <DashboardLayout title="Cadeau Center">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Gift className="h-8 w-8 text-rose-500" />
              Cadeau Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Verstuur cadeaus aan klanten met governance en audit trail
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuw Cadeau
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Concepten</p>
              <p className="text-2xl font-bold">
                {giftOrders.filter(o => o.status === 'DRAFT').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Wacht op goedkeuring</p>
              <p className="text-2xl font-bold text-amber-500">
                {giftOrders.filter(o => o.status === 'APPROVAL_PENDING').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Besteld</p>
              <p className="text-2xl font-bold text-blue-500">
                {giftOrders.filter(o => o.status === 'ORDERED' || o.status === 'SENT').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Afgeleverd</p>
              <p className="text-2xl font-bold text-emerald-500">
                {giftOrders.filter(o => o.status === 'DELIVERED').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Budget limiet</p>
              <p className="text-2xl font-bold">
                €{giftPolicy?.max_amount_per_gift || 100}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Policy Info */}
        {giftPolicy && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gift Policy actief:</span>
                <div className="flex gap-4">
                  <span>Max per cadeau: <strong>€{giftPolicy.max_amount_per_gift}</strong></span>
                  <span>Max per maand/klant: <strong>€{giftPolicy.max_amount_per_month_per_account}</strong></span>
                  <span>Goedkeuring boven: <strong>€{giftPolicy.requires_approval_over_amount}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">Alles</TabsTrigger>
            <TabsTrigger value="DRAFT">Concept</TabsTrigger>
            <TabsTrigger value="APPROVAL_PENDING">Goedkeuring</TabsTrigger>
            <TabsTrigger value="ORDERED">Besteld</TabsTrigger>
            <TabsTrigger value="DELIVERED">Afgeleverd</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Orders List */}
        <div className="space-y-3">
          {ordersLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Laden...
              </CardContent>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>Geen cadeaus gevonden</p>
                <Button variant="outline" className="mt-4" onClick={() => setWizardOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Eerste cadeau maken
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const catConfig = categoryConfig[order.category];
              const statConfig = statusConfig[order.status];
              const vendConfig = vendorConfig[order.vendor];
              
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                          {catConfig.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {catConfig.label} voor {getCustomerName(order.account_id)}
                            </h3>
                            <Badge variant="outline" className={statConfig.color}>
                              {statConfig.icon}
                              <span className="ml-1">{statConfig.label}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>€{order.budget_amount}</span>
                            <span>•</span>
                            <span>{vendConfig.label}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(order.delivery_date), 'd MMM yyyy', { locale: nl })}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {order.delivery_name}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {order.status === 'DRAFT' && (
                          <>
                            <Button 
                              size="sm"
                              onClick={() => handleMarkOrdered(order.id)}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Bestellen
                            </Button>
                            {vendConfig.portalUrl && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(vendConfig.portalUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Portal
                              </Button>
                            )}
                          </>
                        )}
                        {order.status === 'ORDERED' && (
                          <Button 
                            size="sm"
                            onClick={() => handleMarkDelivered(order.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Afgeleverd
                          </Button>
                        )}
                      </div>
                    </div>

                    {order.message_card_text && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm italic">
                        "{order.message_card_text}"
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Create Wizard Dialog */}
        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nieuw Cadeau - Stap {wizardStep} van 4</DialogTitle>
              <DialogDescription>
                {wizardStep === 1 && "Kies categorie, leverancier en budget"}
                {wizardStep === 2 && "Selecteer ontvanger en afleveradres"}
                {wizardStep === 3 && "Kies afleverdatum en bericht"}
                {wizardStep === 4 && "Controleer en verstuur"}
              </DialogDescription>
            </DialogHeader>

            {wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Klant</Label>
                  <Select value={newOrder.account_id} onValueChange={(v) => setNewOrder({ ...newOrder, account_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer klant" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categorie</Label>
                  <Select value={newOrder.category} onValueChange={(v) => setNewOrder({ ...newOrder, category: v as GiftCategory })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {config.icon}
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Leverancier</Label>
                  <Select value={newOrder.vendor} onValueChange={(v) => setNewOrder({ ...newOrder, vendor: v as GiftVendor })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(vendorConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Budget (€)</Label>
                  <Input 
                    type="number" 
                    value={newOrder.budget_amount}
                    onChange={(e) => setNewOrder({ ...newOrder, budget_amount: parseFloat(e.target.value) || 0 })}
                  />
                  {giftPolicy && newOrder.budget_amount > giftPolicy.requires_approval_over_amount && (
                    <p className="text-sm text-amber-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Vereist goedkeuring (boven €{giftPolicy.requires_approval_over_amount})
                    </p>
                  )}
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Naam ontvanger</Label>
                  <Input 
                    value={newOrder.delivery_name}
                    onChange={(e) => setNewOrder({ ...newOrder, delivery_name: e.target.value })}
                    placeholder="Naam op de bezorging"
                  />
                </div>
                <div>
                  <Label>Straat + huisnummer</Label>
                  <Input 
                    value={newOrder.delivery_address_json.street}
                    onChange={(e) => setNewOrder({ 
                      ...newOrder, 
                      delivery_address_json: { ...newOrder.delivery_address_json, street: e.target.value } 
                    })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Postcode</Label>
                    <Input 
                      value={newOrder.delivery_address_json.postal_code}
                      onChange={(e) => setNewOrder({ 
                        ...newOrder, 
                        delivery_address_json: { ...newOrder.delivery_address_json, postal_code: e.target.value } 
                      })}
                    />
                  </div>
                  <div>
                    <Label>Plaats</Label>
                    <Input 
                      value={newOrder.delivery_address_json.city}
                      onChange={(e) => setNewOrder({ 
                        ...newOrder, 
                        delivery_address_json: { ...newOrder.delivery_address_json, city: e.target.value } 
                      })}
                    />
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>Afleverdatum</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newOrder.delivery_date, 'd MMMM yyyy', { locale: nl })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newOrder.delivery_date}
                        onSelect={(date) => date && setNewOrder({ ...newOrder, delivery_date: date })}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Bericht op kaartje</Label>
                  <Textarea 
                    value={newOrder.message_card_text}
                    onChange={(e) => setNewOrder({ ...newOrder, message_card_text: e.target.value })}
                    placeholder="Een persoonlijk bericht..."
                    rows={3}
                  />
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => {
                    const suggestions = [
                      "Hartelijk dank voor de fijne samenwerking dit jaar!",
                      "Met vriendelijke groet en een wens voor veel succes!",
                      "Bedankt voor het vertrouwen in onze diensten.",
                      "Een klein gebaar als blijk van waardering!"
                    ];
                    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
                    setNewOrder({ ...newOrder, message_card_text: suggestion });
                    toast.success('AI Suggestie toegepast', { description: 'Bericht is ingevuld met een suggestie.' });
                  }}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    AI Suggestie
                  </Button>
                </div>
                <div>
                  <Label>Interne reden</Label>
                  <Input 
                    value={newOrder.internal_reason}
                    onChange={(e) => setNewOrder({ ...newOrder, internal_reason: e.target.value })}
                    placeholder="Waarom dit cadeau? (intern)"
                  />
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Klant:</span>
                      <span className="font-medium">{getCustomerName(newOrder.account_id)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categorie:</span>
                      <span className="font-medium">{categoryConfig[newOrder.category].label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Leverancier:</span>
                      <span className="font-medium">{vendorConfig[newOrder.vendor].label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-medium">€{newOrder.budget_amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ontvanger:</span>
                      <span className="font-medium">{newOrder.delivery_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Datum:</span>
                      <span className="font-medium">{format(newOrder.delivery_date, 'd MMM yyyy', { locale: nl })}</span>
                    </div>
                  </CardContent>
                </Card>
                
                {giftPolicy && newOrder.budget_amount > giftPolicy.requires_approval_over_amount && (
                  <div className="p-3 bg-amber-500/10 rounded-lg text-sm text-amber-500 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Dit cadeau vereist goedkeuring voordat het besteld kan worden
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              {wizardStep > 1 && (
                <Button variant="outline" onClick={() => setWizardStep(s => s - 1)}>
                  Vorige
                </Button>
              )}
              {wizardStep < 4 ? (
                <Button 
                  onClick={() => setWizardStep(s => s + 1)}
                  disabled={wizardStep === 1 && !newOrder.account_id}
                >
                  Volgende
                </Button>
              ) : (
                <Button onClick={handleCreateOrder} disabled={createGiftOrder.isPending}>
                  {createGiftOrder.isPending ? 'Bezig...' : 'Cadeau Aanmaken'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default GiftCenter;
