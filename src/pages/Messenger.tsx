import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { MessengerPanel } from '@/components/messenger/MessengerPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { MessageSquare, Search, Truck, MapPin, Calendar, Loader2, ArrowLeft, Users } from 'lucide-react';
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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Truck }> = {
  gepland: { label: 'Gepland', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Calendar },
  onderweg: { label: 'Onderweg', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Truck },
  geladen: { label: 'Geladen', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Truck },
  afgeleverd: { label: 'Afgeleverd', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: MapPin },
  afgerond: { label: 'Afgerond', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: MapPin },
  geannuleerd: { label: 'Geannuleerd', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: MapPin },
};

const Messenger = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const fetchTrips = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          trip_date,
          pickup_city,
          delivery_city,
          status,
          order_number,
          customers(company_name)
        `)
        .order('trip_date', { ascending: false })
        .limit(50);

      if (!error && data) {
        setTrips(data);
        if (data.length > 0 && !selectedTrip) {
          setSelectedTrip(data[0]);
        }
      }
      setLoading(false);
    };

    fetchTrips();
    return () => clearTimeout(timeout);
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

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowChat(true);
  };

  const handleBackToList = () => {
    setShowChat(false);
  };

  return (
    <DashboardLayout title="TMS Messenger" description="Communiceer met chauffeurs en klanten">
      <div className="flex h-[calc(100vh-140px)] gap-6">
        {/* Premium Trip List Sidebar */}
        <Card className={cn(
          "w-full md:w-96 flex-shrink-0 flex flex-col relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-sm shadow-lg",
          showChat && "hidden md:flex"
        )}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
          <CardHeader className="relative border-b border-border/40 pb-4 bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-md">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Order Chats</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{trips.length} actieve gesprekken</p>
              </div>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op locatie, klant of ordernummer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-border/50 rounded-xl"
              />
            </div>
          </CardHeader>
          <CardContent className="relative flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
                    <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">Geen gesprekken</p>
                  <p className="text-sm text-muted-foreground">
                    Start een gesprek vanuit een order of rit
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {filteredTrips.map((trip) => {
                    const status = statusConfig[trip.status] || statusConfig.gepland;
                    return (
                      <button
                        key={trip.id}
                        onClick={() => handleSelectTrip(trip)}
                        className={cn(
                          'w-full p-4 rounded-xl text-left transition-all duration-300 group',
                          'hover:bg-gradient-to-r hover:from-muted/60 hover:to-muted/30 hover:shadow-md',
                          selectedTrip?.id === trip.id
                            ? 'bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 shadow-lg shadow-primary/10'
                            : 'border border-transparent hover:border-border/40'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                              selectedTrip?.id === trip.id ? 'bg-primary/10' : 'bg-muted group-hover:bg-primary/10'
                            )}>
                              <Users className={cn(
                                'w-4 h-4 transition-colors',
                                selectedTrip?.id === trip.id ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                              )} />
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-sm truncate block">
                                {trip.customers?.company_name || 'Onbekende klant'}
                              </span>
                              {trip.order_number && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  #{trip.order_number}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] capitalize flex-shrink-0', status.color)}
                          >
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 pl-10">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {trip.pickup_city || '?'} → {trip.delivery_city || '?'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-10">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>
                            {format(new Date(trip.trip_date), 'd MMM yyyy', { locale: nl })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Panel */}
        <div className={cn(
          "flex-1 min-w-0",
          !showChat && "hidden md:block"
        )}>
          {selectedTrip ? (
            <div className="h-full flex flex-col">
              {/* Mobile back button */}
              <div className="md:hidden mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToList}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Terug naar lijst
                </Button>
              </div>
              <MessengerPanel
                tripId={selectedTrip.id}
                tripName={`${selectedTrip.pickup_city || '?'} → ${selectedTrip.delivery_city || '?'}`}
                orderNumber={selectedTrip.order_number || undefined}
                customerName={selectedTrip.customers?.company_name}
                className="flex-1"
              />
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-sm shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
              <div className="relative text-center px-6">
                <div className="relative mx-auto mb-6">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-primary-glow blur-lg opacity-30" />
                  <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                    <MessageSquare className="w-12 h-12 text-primary" />
                  </div>
                </div>
                <h3 className="font-display font-bold text-xl mb-2">Start een gesprek</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Selecteer een rit uit de lijst om de chat te openen en te communiceren met het team
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
