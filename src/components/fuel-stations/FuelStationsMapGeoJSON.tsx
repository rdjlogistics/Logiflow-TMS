import { useEffect, useRef, useState, useCallback } from 'react';
import type mapboxgl from 'mapbox-gl';
import { loadMapboxGL } from '@/utils/mapbox-loader';
import { cn } from '@/lib/utils';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { FuelStationsGeoJSON } from '@/hooks/useFuelStationsDE';

export interface FuelStationsMapGeoJSONProps {
  token: string;
  mapStyle: string;
  center: { lng: number; lat: number };
  geoJSON: FuelStationsGeoJSON | null;
  selectedFuelType: 'diesel' | 'e10' | 'e5';
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
  onMapReady?: () => void;
  onStyleLoad?: () => void;
  onMapRef?: (map: mapboxgl.Map | null) => void;
  userLocation?: { lng: number; lat: number } | null;
  className?: string;
}

type MapStatus = 'loading' | 'ready' | 'error';

// Zoom thresholds for display modes - adjusted for better desktop visibility
const ZOOM_CLUSTERS_MAX = 9;
const ZOOM_DOTS_MIN = 9;
const ZOOM_DOTS_MAX = 11;
const ZOOM_LABELS_MIN = 11;  // Show price labels earlier on desktop

// Price tier colors (ANWB-style)
const PRICE_COLORS = {
  cheap: '#16a34a',     // Green
  medium: '#f59e0b',    // Amber
  expensive: '#ef4444', // Red
  unknown: '#6b7280',   // Gray
};

function smoothEasing(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function FuelStationsMapGeoJSON({
  token,
  mapStyle,
  center,
  geoJSON,
  selectedStationId,
  onSelectStation,
  onMapReady,
  onStyleLoad,
  onMapRef,
  className,
}: FuelStationsMapGeoJSONProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const lastStyleRef = useRef<string | null>(null);
  const flyingRef = useRef<boolean>(false);
  const initialFitDone = useRef<boolean>(false);
  const sourceAddedRef = useRef<boolean>(false);

  const [mapStatus, setMapStatus] = useState<MapStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Smooth fly to location
  const smoothFlyTo = useCallback((lng: number, lat: number, zoom?: number, duration = 1000) => {
    const map = mapRef.current;
    if (!map || flyingRef.current) return;

    flyingRef.current = true;

    map.flyTo({
      center: [lng, lat],
      zoom: zoom ?? Math.max(map.getZoom(), 14),
      duration,
      easing: smoothEasing,
      essential: true,
    });

    map.once('moveend', () => {
      flyingRef.current = false;
    });
  }, []);

  // Add GeoJSON source and layers
  const addSourceAndLayers = useCallback((map: mapboxgl.Map) => {
    if (sourceAddedRef.current) return;
    if (!geoJSON || geoJSON.features.length === 0) return;

    try {
      // Add clustered source
      map.addSource('fuel-stations', {
        type: 'geojson',
        data: geoJSON,
        cluster: true,
        clusterMaxZoom: ZOOM_CLUSTERS_MAX,
        clusterRadius: 55,
      });

      // ===== CLUSTER LAYER =====
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'fuel-stations',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#60a5fa', 5,  // blue
            '#fbbf24', 15, // amber
            '#f87171'      // red
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            16, 5,
            22, 15,
            28
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Cluster count labels
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'fuel-stations',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // ===== UNCLUSTERED DOTS (zoom 9-11) =====
      map.addLayer({
        id: 'unclustered-dots',
        type: 'circle',
        source: 'fuel-stations',
        filter: ['!', ['has', 'point_count']],
        minzoom: ZOOM_DOTS_MIN,
        maxzoom: ZOOM_LABELS_MIN,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            9, 8,
            11, 12
          ],
          'circle-color': [
            'match',
            ['get', 'priceTier'],
            'cheap', PRICE_COLORS.cheap,
            'medium', PRICE_COLORS.medium,
            'expensive', PRICE_COLORS.expensive,
            PRICE_COLORS.unknown
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });

      // ===== PRICE LABELS (zoom 11+) - Enhanced for desktop =====
      map.addLayer({
        id: 'price-labels',
        type: 'symbol',
        source: 'fuel-stations',
        filter: ['!', ['has', 'point_count']],
        minzoom: ZOOM_LABELS_MIN,
        layout: {
          'text-field': ['get', 'priceLabel'],
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            11, 13,
            14, 16,
            16, 18
          ],
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-padding': 4,
          'symbol-sort-key': ['get', 'priceValue'],  // Cheaper stations get priority
        },
        paint: {
          'text-color': [
            'match',
            ['get', 'priceTier'],
            'cheap', PRICE_COLORS.cheap,
            'medium', PRICE_COLORS.medium,
            'expensive', PRICE_COLORS.expensive,
            PRICE_COLORS.unknown
          ],
          'text-halo-color': '#ffffff',
          'text-halo-width': 2.5,
          'text-halo-blur': 0,
        },
      });

      // ===== BRAND LABELS (zoom 14+) - Show brand name on desktop =====
      map.addLayer({
        id: 'brand-labels',
        type: 'symbol',
        source: 'fuel-stations',
        filter: ['!', ['has', 'point_count']],
        minzoom: 14,
        layout: {
          'text-field': ['get', 'brand'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 1.2],
          'text-allow-overlap': false,
          'text-optional': true,
        },
        paint: {
          'text-color': '#64748b',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });

      // ===== SELECTED STATION HIGHLIGHT =====
      map.addLayer({
        id: 'selected-station',
        type: 'circle',
        source: 'fuel-stations',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-radius': 18,
          'circle-color': 'transparent',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#3b82f6',
        },
      });

      sourceAddedRef.current = true;
    } catch (err) {
      console.error('[FuelStationsMap] Error adding layers:', err);
    }
  }, [geoJSON]);

  // Update GeoJSON data
  const updateSourceData = useCallback((map: mapboxgl.Map) => {
    if (!geoJSON) return;
    
    const source = map.getSource('fuel-stations') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geoJSON);
    }
  }, [geoJSON]);

  // Update selected station filter
  const updateSelectedFilter = useCallback((map: mapboxgl.Map) => {
    if (!map.getLayer('selected-station')) return;
    
    map.setFilter('selected-station', [
      '==', 
      ['get', 'id'], 
      selectedStationId || ''
    ]);
  }, [selectedStationId]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !token) return;
    if (mapRef.current) return;

    let cancelled = false;
    setMapStatus('loading');

    loadMapboxGL().then(mb => {
      if (cancelled || !containerRef.current) return;

      try {
        mb.accessToken = token;

        const map = new mb.Map({
          container: containerRef.current,
          style: mapStyle,
          center: [center.lng, center.lat],
          zoom: 11,
          attributionControl: true,
          failIfMajorPerformanceCaveat: false,
          antialias: true,
          fadeDuration: 150,
        });

        lastStyleRef.current = mapStyle;

        map.addControl(new mb.NavigationControl({ showCompass: false }), 'top-right');

        geolocateRef.current = new mb.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
          showAccuracyCircle: false,
          showUserLocation: true,
        });
        map.addControl(geolocateRef.current, 'bottom-right');

        map.scrollZoom.setWheelZoomRate(1 / 200);

        map.on('load', () => {
          setMapStatus('ready');
          onMapReady?.();
          onMapRef?.(map);
          addSourceAndLayers(map);
          requestAnimationFrame(() => map.resize());
        });

        map.on('style.load', () => {
          sourceAddedRef.current = false;
          initialFitDone.current = true;
          requestAnimationFrame(() => {
            addSourceAndLayers(map);
            updateSelectedFilter(map);
            onStyleLoad?.();
          });
        });

        map.on('click', 'clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          if (!features.length) return;
          const clusterId = features[0].properties?.cluster_id;
          const source = map.getSource('fuel-stations') as mapboxgl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            const coords = (features[0].geometry as any).coordinates;
            map.easeTo({ center: coords, zoom: (zoom ?? 12) + 1, duration: 500 });
          });
        });

        const handleStationClick = (e: mapboxgl.MapMouseEvent) => {
          const layers = ['unclustered-dots', 'price-labels', 'brand-labels'];
          const features = map.queryRenderedFeatures(e.point, { layers });
          if (!features.length) return;
          const stationId = features[0].properties?.id;
          if (stationId) {
            onSelectStation(stationId);
            const coords = (features[0].geometry as any).coordinates;
            smoothFlyTo(coords[0], coords[1], 14);
          }
        };

        map.on('click', 'unclustered-dots', handleStationClick);
        map.on('click', 'price-labels', handleStationClick);
        map.on('click', 'brand-labels', handleStationClick);

        const setCursor = (cursor: string) => () => { map.getCanvas().style.cursor = cursor; };
        const interactiveLayers = ['clusters', 'unclustered-dots', 'price-labels', 'brand-labels'];
        interactiveLayers.forEach(layer => {
          map.on('mouseenter', layer, setCursor('pointer'));
          map.on('mouseleave', layer, setCursor(''));
        });

        map.on('error', (e) => {
          console.error('Mapbox error:', e);
          setMapStatus('error');
          setErrorMessage(e.error?.message || 'Kaart kon niet geladen worden');
        });

        mapRef.current = map;

        roRef.current = new ResizeObserver(() => {
          requestAnimationFrame(() => map.resize());
        });
        roRef.current.observe(containerRef.current!);
      } catch (err: any) {
        console.error('Map init error:', err);
        setMapStatus('error');
        setErrorMessage(err.message);
      }
    });

    return () => {
      cancelled = true;
      roRef.current?.disconnect();
      onMapRef?.(null);
      mapRef.current?.remove();
      mapRef.current = null;
      sourceAddedRef.current = false;
    };
  }, [token]);

  // Update style when changed
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapStyle || lastStyleRef.current === mapStyle) return;

    // Mark that we need to re-add layers after style loads
    sourceAddedRef.current = false;
    lastStyleRef.current = mapStyle;
    
    // The style.load event handler will re-add the layers
    map.setStyle(mapStyle);
  }, [mapStyle]);

  // Update GeoJSON data when it changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== 'ready') return;

    if (sourceAddedRef.current) {
      updateSourceData(map);
    } else {
      addSourceAndLayers(map);
    }

    // Fit bounds on first data load
    if (!initialFitDone.current && geoJSON && geoJSON.features.length > 0) {
      initialFitDone.current = true;
      
      // Calculate bounds
      const coords = geoJSON.features.map(f => f.geometry.coordinates);
      if (coords.length > 1) {
      loadMapboxGL().then(mb => {
        const bounds = coords.reduce(
          (bounds, coord) => bounds.extend(coord as [number, number]),
          new mb.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number])
        );
        
        map.fitBounds(bounds, {
          padding: { top: 80, bottom: 120, left: 40, right: 40 },
          maxZoom: 14,
          duration: 1000,
        });
      });
    }
    }
  }, [geoJSON, mapStatus, addSourceAndLayers, updateSourceData]);

  // Update selected station highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== 'ready') return;

    updateSelectedFilter(map);

    // Fly to selected station
    if (selectedStationId && geoJSON) {
      const feature = geoJSON.features.find(f => f.properties.id === selectedStationId);
      if (feature) {
        const [lng, lat] = feature.geometry.coordinates;
        smoothFlyTo(lng, lat, 14);
      }
    }
  }, [selectedStationId, geoJSON, mapStatus, updateSelectedFilter, smoothFlyTo]);

  return (
    <div className={cn('relative w-full h-full overflow-hidden', className)} style={{ minHeight: 0 >
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'pan-x pan-y' }}
      />

      {(mapStatus === 'loading' || mapStatus === 'error') && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="text-center space-y-3">
            {mapStatus === 'loading' ? (
              <>
                <div className="relative mx-auto w-14 h-14">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                  <div className="relative flex items-center justify-center w-full h-full bg-primary/10 rounded-full">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Kaart laden...</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-sm">Kaart niet beschikbaar</p>
                  {errorMessage && (
                    <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
