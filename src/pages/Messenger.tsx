import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { MessengerPanel } from '@/components/messenger/MessengerPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { MessageSquare, Search, Truck, MapPin, Calendar, Loader2, ArrowLeft, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Trip {
  id: string;
  trip_date: string;
  pickup_city: string | null;
  delivery_city: string | null;
  status: string;
  order_number: string | null;
  customers?: { company_name: string } | null;
}

interface Driver {
  id: string;
  name: string;
  status: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  gepland: { label: 'Gepland', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  onderweg: { label: 'Onderweg', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  geladen: { label: 'Geladen', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  afgeleverd: { label: 'Afgeleverd', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  afgerond: { label: 'Afgerond', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  geannuleerd: { label: 'Geannuleerd', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const Messenger = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'chauffeurs'>('orders');

  useEffect(() => {
    const fetchData = async () => {
      const [tripsRes, driversRes] = await Promise.all([
        supabase
          .from('trips')
          .select('id, trip_date, pickup_city, delivery_city, status, order_number, customers(company_name)')
          .order('trip_date', { ascending: false })
          .limit(50),
        supabase
          .from('drivers')
          .select('id, name, status')
          .eq('status', 'active')
          .order('name'),
      ]);

      if (tripsRes.data) {
        setTrips(tripsRes.data);
        if (tripsRes.data.length > 0) setSelectedTrip(tripsRes.data[0]);
      }
      if (driversRes.data) setDrivers(driversRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredTrips = trips.filter((trip) => {
    const search = searchTerm.toLowerCase();
    return (
      trip.pickup_city?.toLowerCase().includes(search) ||
      trip.delivery_city?.toLowerCase().includes(search) ||
      trip.customers?.company_name?.toLowerCase().includes(search) ||
      trip.order_number?.toLowerCase().includes(search)
    );
  });

  const filteredDrivers = drivers.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setSelectedDriver(null);
    setShowChat(true);
  };

  const handleSelectDriver = (driver: Driver) => {
    // Find most recent trip for this driver to use as chat context
    const driverTrip = trips.find(t => t.status !== 'geannuleerd');
    setSelectedDriver(driver);
    setSelectedTrip(driverTrip || null);
    setShowChat(true);
  };

  const chatContext = selectedDriver
    ? { tripId: selectedTrip?.id || '', tripName: `Chat met ${selectedDriver.name}`, orderNumber: selectedTrip?.order_number || undefined }
    : selectedTrip
    ? { tripId: selectedTrip.id, tripName: `${selectedTrip.pickup_city || '?'} → ${selectedTrip.delivery_city || '?'}`, orderNumber: selectedTrip.order_number || undefined, customerName: selectedTrip.customers?.company_name }
    : null;

  return (
    <DashboardLayout title="TMS Messenger" description="Communiceer met chauffeurs en klanten">
      <div className="flex h-[calc(100vh-140px)] gap-4">
        {/* Sidebar */}
        <Card className={cn(
          "w-full md:w-96 flex-shrink-0 flex flex-col overflow-hidden border-border/40 bg-card/90 backdrop-blur-sm",
          showChat && "hidden md:flex"
        )}>
          <CardHeader className="border-b border-border/40 pb-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Messenger</CardTitle>
                <p className="text-xs text-muted-foreground">{trips.length} orders · {drivers.length} chauffeurs</p>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="w-full">
                <TabsTrigger value="orders" className="flex-1 gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Orders
                </TabsTrigger>
                <TabsTrigger value="chauffeurs" className="flex-1 gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Chauffeurs
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'orders' ? "Zoek order..." : "Zoek chauffeur..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-border/50 rounded-xl"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : activeTab === 'orders' ? (
                <div className="p-3 space-y-1.5">
                  {filteredTrips.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Geen orders gevonden</p>
                    </div>
                  ) : filteredTrips.map((trip) => {
                    const status = statusConfig[trip.status] || statusConfig.gepland;
                    return (
                      <button
                        key={trip.id}
                        onClick={() => handleSelectTrip(trip)}
                        className={cn(
                          'w-full p-3 rounded-xl text-left transition-all group',
                          'hover:bg-muted/50',
                          selectedTrip?.id === trip.id && !selectedDriver
                            ? 'bg-primary/10 border border-primary/30'
                            : 'border border-transparent'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="font-medium text-sm truncate">
                            {trip.customers?.company_name || 'Onbekende klant'}
                          </span>
                          <Badge variant="outline" className={cn('text-[10px] flex-shrink-0', status.color)}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{trip.pickup_city || '?'} → {trip.delivery_city || '?'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(trip.trip_date), 'd MMM yyyy', { locale: nl })}
                          {trip.order_number && <span className="ml-auto font-mono text-[10px]">#{trip.order_number}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  {filteredDrivers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Geen chauffeurs gevonden</p>
                    </div>
                  ) : filteredDrivers.map((driver) => (
                    <button
                      key={driver.id}
                      onClick={() => handleSelectDriver(driver)}
                      className={cn(
                        'w-full p-3 rounded-xl text-left transition-all flex items-center gap-3',
                        'hover:bg-muted/50',
                        selectedDriver?.id === driver.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'border border-transparent'
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{driver.name}</p>
                        <p className="text-xs text-muted-foreground">Actief</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Panel */}
        <div className={cn("flex-1 min-w-0", !showChat && "hidden md:block")}>
          {chatContext ? (
            <div className="h-full flex flex-col">
              <div className="md:hidden mb-2">
                <Button variant="ghost" size="sm" onClick={() => setShowChat(false)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Terug
                </Button>
              </div>
              <MessengerPanel
                tripId={chatContext.tripId}
                tripName={chatContext.tripName}
                orderNumber={chatContext.orderNumber}
                customerName={chatContext.customerName}
                className="flex-1"
              />
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center border-border/40 bg-card/90">
              <div className="text-center px-6">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-bold text-xl mb-2">Start een gesprek</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Selecteer een order of chauffeur om te chatten
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messenger;
