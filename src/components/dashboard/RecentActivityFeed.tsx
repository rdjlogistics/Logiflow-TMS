import React, { useEffect, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  Truck, 
  FileText, 
  CreditCard, 
  User,
  Clock,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "trip" | "invoice" | "payment" | "customer" | "submission";
  title: string;
  description: string;
  status?: string;
  timestamp: string;
  link?: string;
}

interface RecentActivityFeedProps {
  loading?: boolean;
}

const getActivityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "trip": return Truck;
    case "invoice": return FileText;
    case "payment": return CreditCard;
    case "customer": return User;
    case "submission": return Clock;
    default: return Activity;
  }
};

const getActivityConfig = (type: ActivityItem["type"]) => {
  switch (type) {
    case "trip": return { color: "text-primary", bg: "bg-primary/10" };
    case "invoice": return { color: "text-warning", bg: "bg-warning/10" };
    case "payment": return { color: "text-success", bg: "bg-success/10" };
    case "customer": return { color: "text-accent", bg: "bg-accent/10" };
    case "submission": return { color: "text-gold", bg: "bg-gold/10" };
    default: return { color: "text-muted-foreground", bg: "bg-muted/30" };
  }
};

const getStatusBadge = (status?: string) => {
  const configs: Record<string, { label: string; variant: string }> = {
    gepland: { label: "Gepland", variant: "text-primary border-primary/30 bg-primary/5" },
    onderweg: { label: "Onderweg", variant: "text-warning border-warning/30 bg-warning/5" },
    afgerond: { label: "Afgerond", variant: "text-success border-success/30 bg-success/5" },
    geannuleerd: { label: "Geannuleerd", variant: "text-destructive border-destructive/30 bg-destructive/5" },
    betaald: { label: "Betaald", variant: "text-success border-success/30 bg-success/5" },
    verzonden: { label: "Verzonden", variant: "text-primary border-primary/30 bg-primary/5" },
    pending: { label: "In afwachting", variant: "text-warning border-warning/30 bg-warning/5" },
    approved: { label: "Goedgekeurd", variant: "text-success border-success/30 bg-success/5" },
  };

  const config = status ? configs[status] : null;
  if (!config) return null;

  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5 py-0", config.variant)}>
      {config.label}
    </Badge>
  );
};

const RecentActivityFeed = ({ loading: externalLoading }: RecentActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const [
          { data: trips },
          { data: invoices },
          { data: submissions },
        ] = await Promise.all([
          supabase
            .from("trips")
            .select("id, pickup_address, delivery_address, status, created_at, trip_date")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("invoices")
            .select("id, invoice_number, total_amount, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("customer_submissions")
            .select("id, pickup_company, delivery_company, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        const allActivities: ActivityItem[] = [];

        trips?.forEach((trip) => {
          allActivities.push({
            id: trip.id,
            type: "trip",
            title: `Rit ${
              trip.status === "afgerond" ? "afgerond" :
              trip.status === "onderweg" ? "gestart" :
              trip.status === "afgeleverd" ? "afgeleverd" :
              trip.status === "gecontroleerd" ? "gecontroleerd" :
              trip.status === "gefactureerd" ? "gefactureerd" :
              trip.status === "geladen" ? "geladen" :
              trip.status === "gepland" ? "gepland" :
              "aangemaakt"
            }`,
            description: `${trip.pickup_address?.split(",")[0] || "Ophaal"} → ${trip.delivery_address?.split(",")[0] || "Aflever"}`,
            status: trip.status,
            timestamp: trip.created_at,
            link: "/orders",
          });
        });

        invoices?.forEach((invoice) => {
          allActivities.push({
            id: invoice.id,
            type: "invoice",
            title: `Factuur ${invoice.invoice_number}`,
            description: `€${Number(invoice.total_amount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`,
            status: invoice.status,
            timestamp: invoice.created_at,
            link: "/invoices",
          });
        });

        submissions?.forEach((sub) => {
          allActivities.push({
            id: sub.id,
            type: "submission",
            title: "Nieuwe klant aanvraag",
            description: `${sub.pickup_company || "Onbekend"} → ${sub.delivery_company || "Onbekend"}`,
            status: sub.status,
            timestamp: sub.created_at,
            link: "/orders?tab=submissions",
          });
        });

        allActivities.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(allActivities.slice(0, 10));
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  const isLoading = externalLoading || loading;

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15">
              <Activity className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Recente Activiteit</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Laden...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border/20">
                <div className="w-9 h-9 rounded-lg bg-muted/30 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted/30 rounded w-1/3 animate-pulse" />
                  <div className="h-3 bg-muted/20 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <motion.div 
            className="p-2.5 rounded-xl bg-accent/15"
            whileHover={{ rotate: 10, scale: 1.05 }}
          >
            <Activity className="h-5 w-5 text-accent" />
          </motion.div>
          <div>
            <CardTitle className="text-lg font-bold">Recente Activiteit</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Live updates van je operaties</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[320px]">
          <div className="p-4 space-y-1.5">
            {activities.length === 0 ? (
              <motion.div 
                className="flex flex-col items-center justify-center py-12 text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/20 mb-4">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold">Geen recente activiteit</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  Activiteit wordt hier getoond zodra je het systeem gebruikt.
                </p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {activities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);
                  const config = getActivityConfig(activity.type);
                  
                  return (
                    <motion.div
                      key={`${activity.type}-${activity.id}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link to={activity.link || "#"} className="block">
                        <motion.div 
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 border border-transparent hover:border-border/30 transition-all group cursor-pointer"
                          whileHover={{ x: 4 }}
                        >
                          <div className={cn(
                            "p-2 rounded-lg shrink-0 transition-all group-hover:scale-105",
                            config.bg
                          )}>
                            <Icon className={cn("h-4 w-4", config.color)} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold truncate">{activity.title}</p>
                              {getStatusBadge(activity.status)}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {activity.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">
                              {formatDistanceToNow(new Date(activity.timestamp), {
                                addSuffix: true,
                                locale: nl,
                              })}
                            </p>
                          </div>
                          
                          <ArrowRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-1" />
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default memo(RecentActivityFeed);