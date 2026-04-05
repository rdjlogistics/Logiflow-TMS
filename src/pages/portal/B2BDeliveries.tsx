import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/utils/storageUtils";
import { useAuth } from "@/hooks/useAuth";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { B2BLayout } from "@/components/portal/b2b/B2BLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  ClipboardCheck, ChevronDown, ChevronUp, Search, Calendar,
  PenLine, Camera, Clock, MessageSquare, MapPin, Truck, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DeliveryProof {
  id: string;
  stop_id: string;
  trip_id: string;
  signature_url: string | null;
  photo_urls: string[] | null;
  receiver_first_name: string | null;
  receiver_last_name: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  waiting_minutes: number | null;
  loading_minutes: number | null;
  actual_distance_km: number | null;
  sub_status: string | null;
  note: string | null;
  created_at: string;
}

interface DeliveryRow {
  tripId: string;
  orderNumber: string | null;
  reference: string | null;
  pickupCity: string | null;
  deliveryCity: string | null;
  tripDate: string | null;
  status: string | null;
  stops: {
    id: string;
    company_name: string | null;
    city: string | null;
    address: string | null;
  }[];
  proofs: DeliveryProof[];
}

// Signed URL cache
const urlCache = new Map<string, { url: string; expiresAt: number }>();

const B2BDeliveries = () => {
  const { user } = useAuth();
  const { customer } = usePortalAuth();
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const getCachedUrl = useCallback(async (path: string): Promise<string | null> => {
    if (!path) return null;
    const cached = urlCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    const url = await getSignedUrl("pod-files", path);
    if (url) urlCache.set(path, { url, expiresAt: Date.now() + 55 * 60 * 1000 });
    return url;
  }, []);

  const fetchDeliveries = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Get customer for this user
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!customer) { setDeliveries([]); return; }

      // Get submissions with converted trips
      const { data: submissions } = await supabase
        .from("customer_submissions")
        .select("converted_trip_id, reference_number")
        .eq("customer_id", customer.id)
        .not("converted_trip_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!submissions || submissions.length === 0) { setDeliveries([]); return; }

      const tripIds = submissions.map(s => s.converted_trip_id!).filter(Boolean);
      const refMap = new Map(submissions.map(s => [s.converted_trip_id!, s.reference_number]));

      // Fetch trips, stops, proofs in parallel
      const [tripsRes, stopsRes, proofsRes] = await Promise.all([
        supabase.from("trips").select("id, order_number, pickup_city, delivery_city, trip_date, status").in("id", tripIds),
        supabase.from("route_stops").select("id, trip_id, company_name, city, address").in("trip_id", tripIds).order("stop_order"),
        supabase.from("stop_proofs").select("id, stop_id, trip_id, signature_url, photo_urls, receiver_first_name, receiver_last_name, arrival_time, departure_time, waiting_minutes, loading_minutes, actual_distance_km, sub_status, note, created_at").in("trip_id", tripIds),
      ]);

      const trips = tripsRes.data || [];
      const stops = stopsRes.data || [];
      const proofs = proofsRes.data || [];

      const stopsMap = new Map<string, typeof stops>();
      stops.forEach(s => {
        const arr = stopsMap.get(s.trip_id) || [];
        arr.push(s);
        stopsMap.set(s.trip_id, arr);
      });

      const proofsMap = new Map<string, DeliveryProof[]>();
      proofs.forEach(p => {
        const arr = proofsMap.get(p.trip_id) || [];
        arr.push(p as DeliveryProof);
        proofsMap.set(p.trip_id, arr);
      });

      const rows: DeliveryRow[] = trips.map(t => ({
        tripId: t.id,
        orderNumber: t.order_number,
        reference: refMap.get(t.id) || null,
        pickupCity: t.pickup_city,
        deliveryCity: t.delivery_city,
        tripDate: t.trip_date,
        status: t.status,
        stops: stopsMap.get(t.id) || [],
        proofs: proofsMap.get(t.id) || [],
      }));

      setDeliveries(rows);
    } catch (err) {
      console.error("Error fetching deliveries:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  // Load signed URLs when expanding a row
  const handleExpand = useCallback(async (tripId: string) => {
    if (expandedId === tripId) { setExpandedId(null); return; }
    setExpandedId(tripId);

    const row = deliveries.find(d => d.tripId === tripId);
    if (!row) return;

    const pathsToResolve: string[] = [];
    row.proofs.forEach(p => {
      if (p.signature_url) pathsToResolve.push(p.signature_url);
      if (p.photo_urls) pathsToResolve.push(...p.photo_urls);
    });

    const results: Record<string, string> = {};
    await Promise.all(pathsToResolve.map(async (path) => {
      const url = await getCachedUrl(path);
      if (url) results[path] = url;
    }));

    setSignedUrls(prev => ({ ...prev, ...results }));
  }, [expandedId, deliveries, getCachedUrl]);

  // Collect unique substatuses for filter
  const allSubStatuses = useMemo(() => {
    const set = new Set<string>();
    deliveries.forEach(d => d.proofs.forEach(p => { if (p.sub_status) set.add(p.sub_status); }));
    return [...set];
  }, [deliveries]);

  // Filter
  const filtered = useMemo(() => {
    let result = deliveries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.orderNumber?.toLowerCase().includes(q) ||
        d.reference?.toLowerCase().includes(q) ||
        d.pickupCity?.toLowerCase().includes(q) ||
        d.deliveryCity?.toLowerCase().includes(q)
      );
    }
    if (subStatusFilter) {
      result = result.filter(d => d.proofs.some(p => p.sub_status === subStatusFilter));
    }
    return result;
  }, [deliveries, searchQuery, subStatusFilter]);

  const hasProofIndicator = (proofs: DeliveryProof[]) => ({
    signature: proofs.some(p => p.signature_url),
    photos: proofs.some(p => p.photo_urls && p.photo_urls.length > 0),
    waiting: proofs.some(p => (p.waiting_minutes || 0) > 0),
    note: proofs.some(p => p.note),
  });

  return (
    <B2BLayout companyName={customer?.companyName || "Mijn Bedrijf"}>
      <motion.div className="space-y-6" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } } }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              Afleveringen
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bekijk afmeldgegevens, handtekeningen en foto's van uw zendingen
            </p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25, delay: 0.04 } } }} className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op referentie, stad..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {allSubStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allSubStatuses.map(ss => (
                <Badge
                  key={ss}
                  variant={subStatusFilter === ss ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSubStatusFilter(subStatusFilter === ss ? null : ss)}
                >
                  {ss}
                </Badge>
              ))}
              {subStatusFilter && (
                <Button variant="ghost" size="sm" onClick={() => setSubStatusFilter(null)} className="h-6 px-2 text-xs">
                  <X className="h-3 w-3 mr-1" /> Reset
                </Button>
              )}
            </div>
          )}
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Geen afleveringen gevonden</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((row, index) => {
              const indicators = hasProofIndicator(row.proofs);
              const isExpanded = expandedId === row.tripId;
              const subStatuses = [...new Set(row.proofs.map(p => p.sub_status).filter(Boolean))];

              return (
                <motion.div
                  key={row.tripId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, type: "spring", stiffness: 400, damping: 25 }}
                >
                <Collapsible open={isExpanded} onOpenChange={() => handleExpand(row.tripId)}>
                  <CollapsibleTrigger asChild>
                    <Card className={`cursor-pointer transition-all border-border/50 hover:border-primary/30 ${isExpanded ? 'border-primary/40 shadow-md' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{row.orderNumber || row.reference || '—'}</span>
                              {subStatuses.map(ss => (
                                <Badge key={ss} variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/30 text-primary">
                                  {ss}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{row.pickupCity || '?'} → {row.deliveryCity || '?'}</span>
                              {row.tripDate && (
                                <>
                                  <span className="mx-1">·</span>
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(row.tripDate), "d MMM yyyy", { locale: nl })}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {indicators.signature && <Badge variant="secondary" className="h-6 px-1.5 text-[10px]"><PenLine className="h-3 w-3" /></Badge>}
                              {indicators.photos && <Badge variant="secondary" className="h-6 px-1.5 text-[10px]"><Camera className="h-3 w-3" /></Badge>}
                              {indicators.waiting && <Badge variant="secondary" className="h-6 px-1.5 text-[10px]"><Clock className="h-3 w-3" /></Badge>}
                              {indicators.note && <Badge variant="secondary" className="h-6 px-1.5 text-[10px]"><MessageSquare className="h-3 w-3" /></Badge>}
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <Card className="mt-1 border-primary/20 bg-card/60 backdrop-blur-sm">
                            <CardContent className="p-4 space-y-4">
                              {row.proofs.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nog geen afmeldgegevens beschikbaar</p>
                              ) : (
                                row.proofs.map(proof => {
                                  const stop = row.stops.find(s => s.id === proof.stop_id);
                                  return (
                                    <div key={proof.id} className="border border-border/30 rounded-xl p-4 space-y-3">
                                      {/* Stop header */}
                                      <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-primary" />
                                        <span className="font-medium text-sm">{stop?.company_name || 'Stop'}</span>
                                        {stop?.city && <span className="text-xs text-muted-foreground">— {stop.city}</span>}
                                        {proof.sub_status && (
                                          <Badge variant="outline" className="ml-auto text-[10px] border-primary/30 text-primary">{proof.sub_status}</Badge>
                                        )}
                                      </div>

                                      {/* Details grid */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                        {proof.receiver_first_name && (
                                          <div>
                                            <span className="text-muted-foreground">Ontvanger</span>
                                            <p className="font-medium">{proof.receiver_first_name} {proof.receiver_last_name || ''}</p>
                                          </div>
                                        )}
                                        {proof.arrival_time && (
                                          <div>
                                            <span className="text-muted-foreground">Aankomst</span>
                                            <p className="font-medium">{format(new Date(proof.arrival_time), "HH:mm", { locale: nl })}</p>
                                          </div>
                                        )}
                                        {proof.departure_time && (
                                          <div>
                                            <span className="text-muted-foreground">Vertrek</span>
                                            <p className="font-medium">{format(new Date(proof.departure_time), "HH:mm", { locale: nl })}</p>
                                          </div>
                                        )}
                                        {(proof.waiting_minutes || 0) > 0 && (
                                          <div>
                                            <span className="text-muted-foreground">Wachttijd</span>
                                            <p className="font-medium">{proof.waiting_minutes} min</p>
                                          </div>
                                        )}
                                        {(proof.loading_minutes || 0) > 0 && (
                                          <div>
                                            <span className="text-muted-foreground">Laadtijd</span>
                                            <p className="font-medium">{proof.loading_minutes} min</p>
                                          </div>
                                        )}
                                        {(proof.actual_distance_km || 0) > 0 && (
                                          <div>
                                            <span className="text-muted-foreground">Afstand</span>
                                            <p className="font-medium">{proof.actual_distance_km} km</p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Note */}
                                      {proof.note && (
                                        <div className="bg-muted/30 rounded-lg p-3 text-sm">
                                          <span className="text-muted-foreground text-xs">Opmerking chauffeur:</span>
                                          <p className="mt-0.5">{proof.note}</p>
                                        </div>
                                      )}

                                      {/* Signature */}
                                      {proof.signature_url && signedUrls[proof.signature_url] && (
                                        <div>
                                          <span className="text-xs text-muted-foreground mb-1 block">Handtekening</span>
                                          <img
                                            src={signedUrls[proof.signature_url]}
                                            alt="Handtekening"
                                            className="max-h-24 rounded-lg border border-border/30 bg-white p-2 cursor-pointer"
                                            onClick={() => setLightboxUrl(signedUrls[proof.signature_url!])}
                                          />
                                        </div>
                                      )}

                                      {/* Photos */}
                                      {proof.photo_urls && proof.photo_urls.length > 0 && (
                                        <div>
                                          <span className="text-xs text-muted-foreground mb-1 block">Foto's ({proof.photo_urls.length})</span>
                                          <div className="flex flex-wrap gap-2">
                                            {proof.photo_urls.map((path, i) => {
                                              const url = signedUrls[path];
                                              return url ? (
                                                <img
                                                  key={i}
                                                  src={url}
                                                  alt={`Foto ${i + 1}`}
                                                  className="h-20 w-20 object-cover rounded-lg border border-border/30 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                                                  onClick={() => setLightboxUrl(url)}
                                                />
                                              ) : (
                                                <div key={i} className="h-20 w-20 rounded-lg bg-muted/30 animate-pulse" />
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CollapsibleContent>
                </Collapsible>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxUrl && (
            <motion.div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxUrl(null)}
            >
              <motion.img
                src={lightboxUrl}
                alt="Vergrote weergave"
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/10"
                onClick={() => setLightboxUrl(null)}
              >
                <X className="h-6 w-6" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </B2BLayout>
  );
};

export default B2BDeliveries;
