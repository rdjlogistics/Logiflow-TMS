import { useState, useEffect, useRef } from 'react';
import { Clock, Route, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ETABannerProps {
  destinationAddress: string;
  destinationCity?: string | null;
  destinationPostalCode?: string | null;
}

interface ETAData {
  durationMinutes: number;
  distanceKm: number;
  fetchedAt: number;
}

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const etaCache = new Map<string, ETAData>();

export const ETABanner = ({ destinationAddress, destinationCity, destinationPostalCode }: ETABannerProps) => {
  const [eta, setEta] = useState<ETAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    fetchedRef.current = false;
    const cacheKey = `${destinationAddress}-${destinationCity}`;
    const cached = etaCache.get(cacheKey);
    
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setEta(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchETA = async () => {
      try {
        // Get current position
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 60000,
          });
        });

        if (cancelled) return;

        const { latitude: lat, longitude: lng } = position.coords;

        // Get Mapbox token
        const { data: tokenData } = await supabase.functions.invoke('get-mapbox-token');
        if (!tokenData?.token || cancelled) return;

        // Geocode destination
        const fullAddress = `${destinationAddress}, ${destinationPostalCode || ''} ${destinationCity || ''}`.trim();
        const geoRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${tokenData.token}&limit=1`
        );
        const geoData = await geoRes.json();
        
        if (cancelled || !geoData.features?.[0]) return;

        const [destLng, destLat] = geoData.features[0].center;

        // Get directions
        const dirRes = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${lng},${lat};${destLng},${destLat}?access_token=${tokenData.token}&overview=false`
        );
        const dirData = await dirRes.json();

        if (cancelled || !dirData.routes?.[0]) return;

        const route = dirData.routes[0];
        const etaData: ETAData = {
          durationMinutes: Math.round(route.duration / 60),
          distanceKm: Math.round(route.distance / 100) / 10, // 1 decimal
          fetchedAt: Date.now(),
        };

        etaCache.set(cacheKey, etaData);
        setEta(etaData);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchETA();
    return () => { cancelled = true; };
  }, [destinationAddress, destinationCity, destinationPostalCode]);

  if (error || (!loading && !eta)) return null;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-3 border',
      'bg-primary/5 border-primary/20 text-primary'
    )}>
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>ETA berekenen...</span>
        </>
      ) : eta && (
        <>
          <Clock className="w-3.5 h-3.5" />
          <span>~{eta.durationMinutes} min</span>
          <span className="text-muted-foreground">·</span>
          <Route className="w-3.5 h-3.5" />
          <span>{eta.distanceKm} km</span>
        </>
      )}
    </div>
  );
};
