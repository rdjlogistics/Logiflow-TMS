import { useEffect, useState, useRef, useCallback } from "react";
import { haptic } from "@/lib/haptics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  MapPin, Phone, Clock, User, FileSignature, Camera, Navigation,
  Building2, Calendar, Package, ChevronRight, ChevronsLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BaseMap, BaseMapRef } from "@/components/map/BaseMap";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type mapboxgl from 'mapbox-gl';
import { loadMapboxGL } from '@/utils/mapbox-loader';
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import DeliveryConfirmationHeader from "@/components/orders/DeliveryConfirmationHeader";
import ProofSummaryCard from "@/components/orders/ProofSummaryCard";
interface StopWithProof {
  id: string;
  stop_type: string;
  stop_order: number;
  company_name: string | null;
  contact_name: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  customer_reference: string | null;
  planned_date: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  actual_arrival: string | null;
  actual_departure: string | null;
  latitude: number | null;
  longitude: number | null;
  proof?: {
    id: string;
    signature_url: string | null;
    photo_urls: string[] | null;
    receiver_first_name: string | null;
    receiver_last_name: string | null;
    gps_latitude: number | null;
    gps_longitude: number | null;
    gps_accuracy: number | null;
    waiting_minutes: number | null;
    loading_minutes: number | null;
    actual_distance_km: number | null;
    sub_status: string | null;
    note: string | null;
    created_at: string;
  } | null;
}

interface OrderDetailViewProps {
  tripId: string;
}

const OrderDetailView = ({ tripId }: OrderDetailViewProps) => {
  const [stops, setStops] = useState<StopWithProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [signatureDialog, setSignatureDialog] = useState<{ open: boolean; url: string | null }>({ open: false, url: null });
  const [photoDialog, setPhotoDialog] = useState<{ open: boolean; urls: string[] }>({ open: false, urls: [] });
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [collapsedStops, setCollapsedStops] = useState<Set<number>>(new Set());
  const [swipeHintShown, setSwipeHintShown] = useState(false);
  const [tripMeta, setTripMeta] = useState<{
    checkout_completed_at: string | null;
    checkout_completed_by: string | null;
    delivery_confirmation_sent_at: string | null;
    completed_by_name: string | null;
  }>({ checkout_completed_at: null, checkout_completed_by: null, delivery_confirmation_sent_at: null, completed_by_name: null });
  const mapRef = useRef<BaseMapRef>(null);
  const stopsContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const toggleCollapsed = useCallback((idx: number) => {
    setCollapsedStops(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
    if (!swipeHintShown) setSwipeHintShown(true);
  }, [swipeHintShown]);

  const handleSwipeDragEnd = useCallback((idx: number, _: any, info: PanInfo) => {
    const offset = info.offset.x;
    if (Math.abs(offset) > 60) {
      toggleCollapsed(idx);
      haptic('light');
    }
  }, [toggleCollapsed]);

  // IntersectionObserver for sticky header on mobile
  useEffect(() => {
    if (!isMobile || !stopsContainerRef.current || stops.length === 0) return;

    const cards = stopsContainerRef.current.querySelectorAll('[data-stop-index]');
    if (cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible entry
        let maxRatio = 0;
        let maxIndex = activeStopIndex;
        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            maxIndex = Number((entry.target as HTMLElement).dataset.stopIndex);
          }
        });
        if (maxRatio > 0) {
          setActiveStopIndex(maxIndex);
        }
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '-80px 0px -40% 0px',
      }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [isMobile, stops]);

  useEffect(() => {
    fetchStopsWithProofs();
    fetchTripMeta();
  }, [tripId]);

  const fetchTripMeta = async () => {
    const { data: trip } = await supabase
      .from("trips")
      .select("checkout_completed_at, checkout_completed_by, delivery_confirmation_sent_at")
      .eq("id", tripId)
      .single();

    if (trip) {
      let completedByName: string | null = null;
      if ((trip as any).checkout_completed_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", (trip as any).checkout_completed_by)
          .limit(1)
          .maybeSingle();
        completedByName = profile?.full_name || null;
      }
      setTripMeta({
        checkout_completed_at: (trip as any).checkout_completed_at,
        checkout_completed_by: (trip as any).checkout_completed_by,
        delivery_confirmation_sent_at: (trip as any).delivery_confirmation_sent_at,
        completed_by_name: completedByName,
      });
    }
  };

  const fetchStopsWithProofs = async () => {
    setLoading(true);
    try {
      // Fetch route stops
      const { data: stopsData, error: stopsError } = await supabase
        .from("route_stops")
        .select("*")
        .eq("trip_id", tripId)
        .order("stop_order", { ascending: true });

      if (stopsError) throw stopsError;

      // Fetch stop proofs
      const { data: proofsData } = await supabase
        .from("stop_proofs")
        .select("*")
        .eq("trip_id", tripId);

      // Get signed URLs for signatures and photos
      const stopsWithProofs: StopWithProof[] = await Promise.all(
        (stopsData || []).map(async (stop: any) => {
          const proof = (proofsData || []).find((p: any) => p.stop_id === stop.id);
          let signedSignatureUrl: string | null = null;
          let signedPhotoUrls: string[] = [];

          if (proof?.signature_url) {
            const { data } = await supabase.storage
              .from("pod-files")
              .createSignedUrl(proof.signature_url, 3600);
            signedSignatureUrl = data?.signedUrl || null;
          }

          if (proof?.photo_urls?.length) {
            const photoPromises = proof.photo_urls.map(async (url: string) => {
              const { data } = await supabase.storage
                .from("pod-files")
                .createSignedUrl(url, 3600);
              return data?.signedUrl || '';
            });
            signedPhotoUrls = (await Promise.all(photoPromises)).filter(Boolean);
          }

          return {
            id: stop.id,
            stop_type: stop.stop_type,
            stop_order: stop.stop_order,
            company_name: stop.company_name,
            contact_name: stop.contact_name,
            street: stop.street,
            house_number: stop.house_number,
            postal_code: stop.postal_code,
            city: stop.city,
            phone: stop.phone,
            customer_reference: stop.customer_reference,
            planned_date: stop.planned_date,
            time_window_start: stop.time_window_start,
            time_window_end: stop.time_window_end,
            actual_arrival: stop.actual_arrival,
            actual_departure: stop.actual_departure,
            latitude: stop.latitude,
            longitude: stop.longitude,
            proof: proof ? {
              id: proof.id,
              signature_url: signedSignatureUrl,
              photo_urls: signedPhotoUrls,
              receiver_first_name: proof.receiver_first_name,
              receiver_last_name: proof.receiver_last_name,
              gps_latitude: proof.latitude,
              gps_longitude: proof.longitude,
              gps_accuracy: proof.accuracy,
              waiting_minutes: proof.waiting_minutes,
              loading_minutes: proof.loading_minutes,
              actual_distance_km: proof.actual_distance_km,
              sub_status: proof.sub_status,
              note: proof.note,
              created_at: proof.created_at,
            } : null,
          };
        })
      );

      setStops(stopsWithProofs);
    } catch (err) {
      console.error("Error fetching stops:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMapLoad = useCallback((map: mapboxgl.Map) => {
    if (!stops.length) return;
    addMarkersToMap(map);
  }, [stops]);

  const addMarkersToMap = async (map: mapboxgl.Map) => {
    const mb = await loadMapboxGL();
    const bounds = new mb.LngLatBounds();
    let hasCoords = false;

    stops.forEach((stop, idx) => {
      // Stop marker (planned location)
      if (stop.latitude && stop.longitude) {
        hasCoords = true;
        const color = stop.stop_type === 'pickup' ? '#f97316' : '#22c55e';
        const el = createMarkerElement(idx + 1, color);
        new mb.Marker({ element: el })
          .setLngLat([stop.longitude, stop.latitude])
          .setPopup(new mb.Popup({ offset: 25 }).setHTML(
            `<strong>${stop.company_name || `Stop ${idx + 1}`}</strong><br/>${stop.city || ''}`
          ))
          .addTo(map);
        bounds.extend([stop.longitude, stop.latitude]);
      }

      // GPS marker from proof (actual location at sign-off)
      if (stop.proof?.gps_latitude && stop.proof?.gps_longitude) {
        hasCoords = true;
        const gpsEl = createMarkerElement(idx + 1, '#3b82f6', true);
        new mb.Marker({ element: gpsEl })
          .setLngLat([stop.proof.gps_longitude, stop.proof.gps_latitude])
          .setPopup(new mb.Popup({ offset: 25 }).setHTML(
            `<strong>GPS bij afmelding</strong><br/>Nauwkeurigheid: ${stop.proof.gps_accuracy?.toFixed(0) || '?'}m`
          ))
          .addTo(map);
        bounds.extend([stop.proof.gps_longitude, stop.proof.gps_latitude]);
      }
    });

    if (hasCoords) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  };

  // Re-add markers when stops change
  useEffect(() => {
    if (mapRef.current?.map && stops.length > 0) {
      addMarkersToMap(mapRef.current.map);
    }
  }, [stops]);

  const createMarkerElement = (number: number, color: string, isGps = false) => {
    const el = document.createElement('div');
    el.className = 'flex items-center justify-center';
    el.style.cssText = `
      width: ${isGps ? '24px' : '32px'}; 
      height: ${isGps ? '24px' : '32px'}; 
      background: ${color}; 
      border-radius: 50%; 
      border: 2px solid white; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.3); 
      color: white; 
      font-weight: bold; 
      font-size: ${isGps ? '10px' : '13px'}; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      cursor: pointer;
    `;
    el.textContent = isGps ? '◉' : String(number);
    return el;
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '-';
    try {
      return format(new Date(iso), 'HH:mm', { locale: nl });
    } catch { return '-'; }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '-';
    try {
      return format(new Date(iso), 'dd-MM-yyyy', { locale: nl });
    } catch { return '-'; }
  };
  const renderStopContent = (stop: StopWithProof, idx: number) => (
    <div className="flex flex-col lg:flex-row">
      {/* Left: Address info */}
      <div className="flex-1 p-4">
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white shrink-0 ${
            stop.stop_type === 'pickup' ? 'bg-orange-500' : 'bg-green-500'
          }`}>
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={stop.stop_type === 'pickup' ? 'default' : 'secondary'} className="text-xs">
                {stop.stop_type === 'pickup' ? 'Ophalen' : stop.stop_type === 'delivery' ? 'Afleveren' : 'Ophalen/Afleveren'}
              </Badge>
            </div>
            {stop.company_name && (
              <p className="font-semibold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {stop.company_name}
              </p>
            )}
            {stop.contact_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                T.a.v. {stop.contact_name}
              </p>
            )}
            <p className="text-sm">
              {[stop.street, stop.house_number].filter(Boolean).join(' ')}
            </p>
            <p className="text-sm text-muted-foreground">
              {[stop.postal_code, stop.city].filter(Boolean).join(' ')}
            </p>
            {stop.phone && (
              <p className="text-sm flex items-center gap-1.5 mt-1">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {stop.phone}
              </p>
            )}
            {stop.customer_reference && (
              <p className="text-xs text-muted-foreground mt-1">
                Ref: {stop.customer_reference}
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator orientation="vertical" className="hidden lg:block" />
      <Separator className="lg:hidden" />

      {/* Right: Times + proof info */}
      <div className="w-full lg:w-72 p-4 space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Datum:
          </span>
          <span>{formatDate(stop.planned_date)}</span>

          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Tijdvenster:
          </span>
          <span>{stop.time_window_start || '-'} - {stop.time_window_end || '-'}</span>

          <span className="text-muted-foreground">Werkelijke tijd:</span>
          <span className="font-medium text-primary">{formatTime(stop.actual_arrival)}</span>

          <span className="text-muted-foreground">Vertrektijd:</span>
          <span>{formatTime(stop.actual_departure)}</span>
        </div>

        {stop.proof && (
          <>
            <Separator className="my-2" />
            <div className="text-sm space-y-1.5">
              {(stop.proof.receiver_first_name || stop.proof.receiver_last_name) && (
                <p className="text-muted-foreground">
                  {stop.stop_type === 'pickup' ? 'Afgegeven door' : 'Ontvangen door'}:{' '}
                  <span className="text-foreground font-medium">
                    {[stop.proof.receiver_first_name, stop.proof.receiver_last_name].filter(Boolean).join(' ')}
                  </span>
                </p>
              )}
              {stop.proof.sub_status && (
                <p className="text-muted-foreground flex items-center gap-1.5">
                  Substatus:{' '}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
                    {stop.proof.sub_status}
                  </Badge>
                </p>
              )}
              {(stop.proof.waiting_minutes != null && stop.proof.waiting_minutes > 0) && (
                <p className="text-muted-foreground">
                  Wachttijd: <span className="text-foreground font-medium">{stop.proof.waiting_minutes} min</span>
                </p>
              )}
              {(stop.proof.loading_minutes != null && stop.proof.loading_minutes > 0) && (
                <p className="text-muted-foreground">
                  Laad-/lostijd: <span className="text-foreground font-medium">{stop.proof.loading_minutes} min</span>
                </p>
              )}
              {(stop.proof.actual_distance_km != null && stop.proof.actual_distance_km > 0) && (
                <p className="text-muted-foreground">
                  Werkelijke afstand: <span className="text-foreground font-medium">{stop.proof.actual_distance_km} km</span>
                </p>
              )}
              {stop.proof.note && (
                <p className="text-muted-foreground">
                  Opmerking: <span className="text-foreground">{stop.proof.note}</span>
                </p>
              )}
            </div>
          </>
        )}

        {/* POD Action Icons */}
        <div className="flex items-center gap-1 pt-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${stop.proof?.signature_url ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground/40'}`}
            disabled={!stop.proof?.signature_url}
            onClick={() => stop.proof?.signature_url && setSignatureDialog({ open: true, url: stop.proof.signature_url })}
            title="Handtekening"
          >
            <FileSignature className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${stop.proof?.photo_urls?.length ? 'text-blue-500 hover:text-blue-600' : 'text-muted-foreground/40'}`}
            disabled={!stop.proof?.photo_urls?.length}
            onClick={() => stop.proof?.photo_urls?.length && setPhotoDialog({ open: true, urls: stop.proof.photo_urls })}
            title="Foto's"
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${stop.proof?.gps_latitude ? 'text-orange-500 hover:text-orange-600' : 'text-muted-foreground/40'}`}
            disabled={!stop.proof?.gps_latitude}
            onClick={() => {
              if (stop.proof?.gps_latitude && stop.proof?.gps_longitude) {
                mapRef.current?.flyTo([stop.proof.gps_longitude, stop.proof.gps_latitude], 16);
              }
            }}
            title="GPS locatie"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (stops.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Geen bestemmingen gevonden voor deze order.
      </div>
    );
  }

   return (
    <div className="space-y-6">
      {/* Delivery Confirmation Header */}
      <DeliveryConfirmationHeader
        tripId={tripId}
        checkoutCompletedAt={tripMeta.checkout_completed_at}
        checkoutCompletedBy={tripMeta.checkout_completed_by}
        deliveryConfirmationSentAt={tripMeta.delivery_confirmation_sent_at}
        completedByName={tripMeta.completed_by_name}
      />

      {/* Proof Summary Card */}
      <ProofSummaryCard stops={stops} />

      {/* Section: Location Map (shown first on mobile for quick access) */}
      {isMobile && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Locatiekaart
          </h3>
          <Card className="overflow-hidden">
            <div className="h-[250px] relative">
              <BaseMap
                ref={mapRef}
                style="streets"
                showGeolocate={false}
                showTraffic={true}
                zoom={7}
                className="w-full h-full"
                onLoad={handleMapLoad}
              />
            </div>
            <div className="flex items-center gap-6 px-4 py-2.5 bg-muted/30 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500 border border-white shadow-sm" />
                Ophalen
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm" />
                Afleveren
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm" />
                GPS bij afmelding
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Section 1: Destinations Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Bestemmingen
        </h3>

        {/* Sticky mobile header */}
        {isMobile && stops.length > 1 && (
          <div className="sticky top-0 z-10 md:hidden bg-background/90 backdrop-blur-sm border-b border-border px-4 py-2.5 -mx-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stops.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      i === activeStopIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Stop {activeStopIndex + 1} van {stops.length}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={stops[activeStopIndex]?.stop_type === 'pickup' ? 'default' : 'secondary'}
                size="sm"
              >
                {stops[activeStopIndex]?.stop_type === 'pickup' ? 'Ophalen' : stops[activeStopIndex]?.stop_type === 'delivery' ? 'Afleveren' : 'Ophalen/Afleveren'}
              </Badge>
              <span className="text-sm font-medium truncate">
                {stops[activeStopIndex]?.company_name || stops[activeStopIndex]?.city || `Stop ${activeStopIndex + 1}`}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3" ref={stopsContainerRef}>
          {stops.map((stop, idx) => {
            const isCollapsed = isMobile && collapsedStops.has(idx);

            return (
              <div key={stop.id} data-stop-index={idx}>
                {isMobile ? (
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.3}
                    onDragEnd={(_, info) => handleSwipeDragEnd(idx, _, info)}
                    className="touch-pan-y"
                  >
                    <Card variant="default" className="overflow-hidden">
                      <AnimatePresence mode="wait" initial={false}>
                        {isCollapsed ? (
                          <motion.div
                            key="collapsed"
                            initial={{ height: 0, opacity: 0 }}
                            exit={{ height: 0, opacity: 0 }}
                            onClick={() => toggleCollapsed(idx)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-3 px-4 py-3">
                              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shrink-0 ${
                                stop.stop_type === 'pickup' ? 'bg-orange-500' : 'bg-green-500'
                              }`}>
                                {idx + 1}
                              </div>
                              <Badge variant={stop.stop_type === 'pickup' ? 'default' : 'secondary'} size="sm">
                                {stop.stop_type === 'pickup' ? 'Ophalen' : stop.stop_type === 'delivery' ? 'Afleveren' : 'Ophalen/Afleveren'}
                              </Badge>
                              <span className="text-sm font-medium truncate flex-1">
                                {stop.company_name || stop.city || `Stop ${idx + 1}`}
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="expanded"
                            initial={{ height: 0, opacity: 0 }}
                            exit={{ height: 0, opacity: 0 }}
                          >
                            {/* Swipe hint on first card */}
                            {idx === 0 && !swipeHintShown && (
                              <div className="flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground bg-muted/50">
                                <ChevronsLeft className="h-3 w-3" />
                                <span>Swipe om in te klappen</span>
                              </div>
                            )}
                            {renderStopContent(stop, idx)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ) : (
                  <Card variant="default" className="overflow-hidden">
                    {renderStopContent(stop, idx)}
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Location Map (desktop only - mobile shown above) */}
      {!isMobile && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Locatiekaart
          </h3>
          <Card className="overflow-hidden">
            <div className="h-[400px] relative">
              <BaseMap
                ref={mapRef}
                style="streets"
                showGeolocate={false}
                showTraffic={true}
                zoom={7}
                className="w-full h-full"
                onLoad={handleMapLoad}
              />
            </div>
            {/* Legend */}
            <div className="flex items-center gap-6 px-4 py-2.5 bg-muted/30 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500 border border-white shadow-sm" />
                Ophalen
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm" />
                Afleveren
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm" />
                GPS bij afmelding
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Signature Dialog */}
      <Dialog open={signatureDialog.open} onOpenChange={(o) => setSignatureDialog({ open: o, url: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Handtekening
            </DialogTitle>
          </DialogHeader>
          {signatureDialog.url && (
            <div className="bg-white rounded-lg p-4 border">
              <img src={signatureDialog.url} alt="Handtekening" className="w-full h-auto" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Dialog */}
      <Dialog open={photoDialog.open} onOpenChange={(o) => setPhotoDialog({ open: o, urls: [] })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Foto's
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-auto">
            {photoDialog.urls.map((url, i) => (
              <div key={i} className="rounded-lg overflow-hidden border bg-muted">
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-auto object-cover" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetailView;
