import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Info, 
  History, 
  FileText, 
  MessageSquare, 
  Shield, 
  Bot,
  MapPin,
  Calendar,
  User,
  Truck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  FileCheck,
  Euro,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import OrderStatusBadge from "./OrderStatusBadge";

interface OrderContextDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}

interface OrderEvent {
  id: string;
  event_type: string;
  payload: any;
  created_at: string;
  created_by?: string;
}

interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  trip_date: string;
  driver_id?: string | null;
  carrier_id?: string | null;
  customer_id?: string | null;
  customers?: { company_name: string } | null;
  carriers?: { company_name: string } | null;
  vehicles?: { license_plate: string } | null;
  sales_total?: number | null;
  purchase_total?: number | null;
  gross_profit?: number | null;
  pickup_city?: string | null;
  delivery_city?: string | null;
}

const eventTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ORDER_CREATED: { label: 'Order aangemaakt', icon: <FileText className="h-3 w-3" />, color: 'text-primary' },
  STATUS_CHANGE: { label: 'Status gewijzigd', icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-blue-600' },
  DRIVER_ASSIGNED: { label: 'Chauffeur toegewezen', icon: <User className="h-3 w-3" />, color: 'text-green-600' },
  STOP_ARRIVED: { label: 'Aankomst bij stop', icon: <MapPin className="h-3 w-3" />, color: 'text-orange-600' },
  STOP_COMPLETED: { label: 'Stop afgerond', icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-green-600' },
  WAITING_TIME_START: { label: 'Wachttijd gestart', icon: <Clock className="h-3 w-3" />, color: 'text-warning' },
  WAITING_TIME_STOP: { label: 'Wachttijd gestopt', icon: <Clock className="h-3 w-3" />, color: 'text-muted-foreground' },
  POD_UPLOADED: { label: 'POD geüpload', icon: <FileCheck className="h-3 w-3" />, color: 'text-success' },
  INVOICE_CREATED: { label: 'Factuur aangemaakt', icon: <Euro className="h-3 w-3" />, color: 'text-purple-600' },
  ORDER_VERIFIED: { label: 'Order gecontroleerd', icon: <Shield className="h-3 w-3" />, color: 'text-purple-600' },
  MESSAGE_SENT: { label: 'Bericht verstuurd', icon: <Send className="h-3 w-3" />, color: 'text-blue-600' },
  ORDER_DISPATCHED: { label: 'Order gedispatcht', icon: <Truck className="h-3 w-3" />, color: 'text-primary' },
  PRICING_UPDATED: { label: 'Prijs bijgewerkt', icon: <Euro className="h-3 w-3" />, color: 'text-muted-foreground' },
};

const OrderContextDrawer = ({ open, onOpenChange, orderId }: OrderContextDrawerProps) => {
  const [activeTab, setActiveTab] = useState("details");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      fetchOrderData();
    }
  }, [open, orderId]);

  const fetchOrderData = async () => {
    if (!orderId) return;
    setLoading(true);

    try {
      // Fetch order details
      const { data: orderData } = await supabase
        .from('trips')
        .select(`
          *,
          customers(company_name),
          carriers(company_name),
          vehicles(license_plate)
        `)
        .eq('id', orderId)
        .single();

      if (orderData) setOrder(orderData as unknown as OrderDetails);

      // Fetch events
      const { data: eventsData } = await supabase
        .from('order_events')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (eventsData) setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching order data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventTime = (dateString: string) => {
    return format(new Date(dateString), "d MMM HH:mm", { locale: nl });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">
              {order?.order_number || 'Order details'}
            </SheetTitle>
            {order && (
              <OrderStatusBadge
                status={order.status}
                driverId={order.driver_id}
                carrierId={order.carrier_id}
              />
            )}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100vh-80px)]">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="details" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs"
            >
              <Info className="h-3.5 w-3.5 mr-1.5" />
              Details
            </TabsTrigger>
            <TabsTrigger 
              value="timeline"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs"
            >
              <History className="h-3.5 w-3.5 mr-1.5" />
              Timeline
            </TabsTrigger>
            <TabsTrigger 
              value="docs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Docs
            </TabsTrigger>
            <TabsTrigger 
              value="chat"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger 
              value="audit"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs"
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Audit
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="details" className="m-0 p-4 space-y-4">
              {order && (
                <>
                  {/* Quick info cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-xs">Datum</span>
                      </div>
                      <p className="text-sm font-medium">
                        {format(new Date(order.trip_date), "EEEE d MMMM", { locale: nl })}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <User className="h-3.5 w-3.5" />
                        <span className="text-xs">Klant</span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {order.customers?.company_name || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Route */}
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">{order.pickup_city || 'Ophaaladres'}</span>
                    </div>
                    <div className="ml-1 border-l-2 border-dashed border-border h-4" />
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm">{order.delivery_city || 'Afleveradres'}</span>
                    </div>
                  </div>

                  {/* Financial summary */}
                  <div className="p-3 rounded-lg bg-gradient-to-br from-success/5 to-primary/5 border border-border/50">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Financieel</h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-bold">€{(order.sales_total || 0).toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground">Verkoop</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">€{(order.purchase_total || 0).toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground">Inkoop</p>
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${(order.gross_profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          €{(order.gross_profit || 0).toFixed(0)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Marge</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="m-0 p-4">
              <div className="space-y-3">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Geen events gevonden
                  </p>
                ) : (
                  events.map((event, index) => {
                    const eventConfig = eventTypeLabels[event.event_type] || {
                      label: event.event_type,
                      icon: <History className="h-3 w-3" />,
                      color: 'text-muted-foreground'
                    };

                    return (
                      <div key={event.id} className="relative pl-6">
                        {/* Timeline line */}
                        {index < events.length - 1 && (
                          <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />
                        )}
                        
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full bg-background border-2 flex items-center justify-center ${eventConfig.color}`}>
                          {eventConfig.icon}
                        </div>

                        <div className="pb-4">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-sm font-medium ${eventConfig.color}`}>
                              {eventConfig.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatEventTime(event.created_at)}
                            </span>
                          </div>
                          {event.payload && Object.keys(event.payload).length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {JSON.stringify(event.payload).slice(0, 100)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="docs" className="m-0 p-4">
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Documenten worden hier weergegeven</p>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="m-0 p-4">
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chat berichten worden hier weergegeven</p>
              </div>
            </TabsContent>

            <TabsContent value="audit" className="m-0 p-4">
              <div className="space-y-2">
                {events.map((event) => (
                  <div 
                    key={event.id} 
                    className="p-2 rounded-md bg-muted/30 border border-border/50 text-xs font-mono"
                  >
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>{event.event_type}</span>
                      <span>{format(new Date(event.created_at), "yyyy-MM-dd HH:mm:ss")}</span>
                    </div>
                    <pre className="text-[10px] overflow-x-auto">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default OrderContextDrawer;
