import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BaseMap, BaseMapRef } from '@/components/map/BaseMap';
import type mapboxgl from 'mapbox-gl';
import { loadMapboxGL } from '@/utils/mapbox-loader';
import { OrderStatus } from '@/types/orderStatus';
import { cn } from '@/lib/utils';
import { useAllDriverLocations } from '@/hooks/useAllDriverLocations';

// --- Status color mapping ---
const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  gepland: '#3b82f6',
  onderweg: '#f59e0b',
  geladen: '#f97316',
  afgeleverd: '#22c55e',
  afgerond: '#10b981',
  gecontroleerd: '#8b5cf6',
  gefactureerd: '#6b7280',
  geannuleerd: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Concept',
  gepland: 'Gepland',
  onderweg: 'Onderweg',
  geladen: 'Geladen',
  afgeleverd: 'Afgeleverd',
  afgerond: 'Afgemeld',
  gecontroleerd: 'Gecontroleerd',
  gefactureerd: 'Gefactureerd',
  geannuleerd: 'Geannuleerd',
};

interface OrderLocationMapProps {
  orders: Array<{
    id: string;
    order_number: string | null;
    status: string;
    pickup_city?: string | null;
    pickup_latitude?: number | null;
    pickup_longitude?: number | null;
    delivery_city?: string | null;
    delivery_latitude?: number | null;
    delivery_longitude?: number | null;
    customers?: { company_name: string } | null;
  }>;
  onOrderSelect?: (orderId: string) => void;
  className?: string;
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#94a3b8';
}

function createMarkerEl(
  type: 'pickup' | 'delivery',
  status: string,
  orderNumber: string | null,
  isMobile: boolean = false
): HTMLDivElement {
  const color = getStatusColor(status);
  const el = document.createElement('div');

  if (isMobile) {
    // Mobile: compact colored dot with larger touch area
    el.style.cssText = `
      width:14px;height:14px;border-radius:50%;
      background:${color};
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
      cursor:pointer;
      border:2px solid rgba(255,255,255,0.9);
      position:relative;
    `;
    // Invisible expanded touch target
    const touchArea = document.createElement('div');
    touchArea.style.cssText = `
      position:absolute;top:-13px;left:-13px;right:-13px;bottom:-13px;
    `;
    el.appendChild(touchArea);
  } else {
    // Desktop: pill-shaped marker with order number
    const icon = type === 'pickup' ? '▲' : '▼';
    const label = orderNumber || '-';
    el.style.cssText = `
      display:flex;align-items:center;gap:4px;
      padding:3px 8px 3px 6px;border-radius:20px;
      background:${color};color:white;
      font-size:11px;font-weight:600;font-family:system-ui,sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      cursor:pointer;white-space:nowrap;
      border:2px solid rgba(255,255,255,0.9);
      transition:transform 0.15s ease;
    `;
    el.innerHTML = `<span style="font-size:10px">${icon}</span><span>${label}</span>`;
    el.onmouseenter = () => { el.style.transform = 'scale(1.15)'; };
    el.onmouseleave = () => { el.style.transform = 'scale(1)'; };
  }
  return el;
}

function createPopupHTML(
  order: OrderLocationMapProps['orders'][0],
  type: 'pickup' | 'delivery'
): string {
  const color = getStatusColor(order.status);
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const city = type === 'pickup' ? order.pickup_city : order.delivery_city;
  const typeLabel = type === 'pickup' ? 'Ophalen' : 'Afleveren';
  const customer = order.customers?.company_name || '—';

  return `
    <div style="font-family:system-ui,sans-serif;min-width:180px;padding:2px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="background:${color};color:white;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">${statusLabel}</span>
        <span style="font-size:10px;color:#6b7280">${typeLabel}</span>
      </div>
      <div style="font-weight:700;font-size:13px;color:#111">${order.order_number || '—'}</div>
      <div style="font-size:11px;color:#374151;margin-top:2px">${customer}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:1px">${city || '—'}</div>
      <button onclick="window.dispatchEvent(new CustomEvent('map-order-edit',{detail:'${order.id}'}))"
        style="margin-top:8px;width:100%;padding:5px 0;background:${color};color:white;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer">
        Bekijken
      </button>
    </div>
  `;
}

// --- Driver marker helpers ---
function createDriverMarkerEl(driverName: string, heading: number | null, isRecent: boolean): HTMLDivElement {
  const el = document.createElement('div');
  const rotation = heading != null ? heading : 0;
  const pulse = isRecent
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid hsl(217,91%,60%);animation:driver-pulse 2s ease-out infinite;opacity:0;"></div>`
    : '';
  el.style.cssText = `position:relative;width:32px;height:32px;cursor:pointer;`;
  el.innerHTML = `
    ${pulse}
    <div style="width:32px;height:32px;border-radius:50%;background:hsl(217,91%,60%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="transform:rotate(${rotation}deg)">
        <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="white"/>
      </svg>
    </div>
  `;
  return el;
}

function createDriverPopupHTML(driver: { driver_name: string; speed: number | null; recorded_at: string; phone: string | null }): string {
  const ago = Math.round((Date.now() - new Date(driver.recorded_at).getTime()) / 60000);
  const agoLabel = ago < 1 ? 'Zojuist' : `${ago} min geleden`;
  const speedLabel = driver.speed != null ? `${Math.round(driver.speed * 3.6)} km/u` : '—';
  return `
    <div style="font-family:system-ui,sans-serif;min-width:160px;padding:2px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="width:8px;height:8px;border-radius:50%;background:hsl(217,91%,60%);flex-shrink:0"></span>
        <span style="font-weight:700;font-size:13px;color:#111">${driver.driver_name}</span>
      </div>
      <div style="font-size:11px;color:#374151">Snelheid: ${speedLabel}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:1px">${agoLabel}</div>
      ${driver.phone ? `<div style="font-size:11px;color:#6b7280;margin-top:1px">📞 ${driver.phone}</div>` : ''}
    </div>
  `;
}

// Inject pulse keyframes once
if (typeof document !== 'undefined' && !document.getElementById('driver-pulse-style')) {
  const style = document.createElement('style');
  style.id = 'driver-pulse-style';
  style.textContent = `@keyframes driver-pulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}`;
  document.head.appendChild(style);
}

const MapLegend: React.FC<{ isMobile?: boolean; hasDrivers?: boolean }> = ({ isMobile = false, hasDrivers = false }) => {
  const [open, setOpen] = useState(!isMobile);
  const activeStatuses = ['gepland', 'onderweg', 'geladen', 'afgeleverd', 'afgerond', 'gecontroleerd', 'draft', 'geannuleerd'];

  if (isMobile && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg px-2.5 py-1.5 text-[10px] font-semibold text-foreground"
      >
        Legenda
      </button>
    );
  }

  return (
    <div className={cn(
      "absolute z-10 bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg p-2.5",
      isMobile ? "bottom-2 right-2 max-w-[160px]" : "bottom-2 left-2 max-w-[200px]"
    )}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Legenda</div>
        {isMobile && (
          <button onClick={() => setOpen(false)} className="text-muted-foreground text-xs ml-2">✕</button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {activeStatuses.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: STATUS_COLORS[s] }}
            />
            <span className="text-[10px] text-muted-foreground truncate">{STATUS_LABELS[s]}</span>
          </div>
        ))}
        {hasDrivers && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: 'hsl(217,91%,60%)' }} />
            <span className="text-[10px] text-muted-foreground truncate">Chauffeur</span>
          </div>
        )}
      </div>
      {!isMobile && (
        <div className="border-t border-border/30 mt-1.5 pt-1.5 flex gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[10px]">▲</span>
            <span className="text-[10px] text-muted-foreground">Ophalen</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px]">▼</span>
            <span className="text-[10px] text-muted-foreground">Afleveren</span>
          </div>
        </div>
      )}
    </div>
  );
};

const OrderLocationMap: React.FC<OrderLocationMapProps> = ({
  orders,
  onOrderSelect,
  className,
}) => {
  const mapRef = useRef<BaseMapRef>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const driverMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const isMobile = useIsMobile();

  const { locations: driverLocations } = useAllDriverLocations({ refreshInterval: 15000, maxAgeMinutes: 30 });

  // Count orders with coordinates
  const ordersWithCoords = useMemo(
    () => orders.filter((o) => (o.pickup_latitude && o.pickup_longitude) || (o.delivery_latitude && o.delivery_longitude)),
    [orders]
  );

  const handleMapLoad = useCallback(async (map: mapboxgl.Map) => {
    const mb = await loadMapboxGL();
    mapInstanceRef.current = map;
    const bounds = new mb.LngLatBounds();
    let hasCoords = false;

    // Build GeoJSON for route lines
    const routeFeatures: GeoJSON.Feature[] = [];

    orders.forEach((order) => {
      const color = getStatusColor(order.status);

      // Pickup marker
      if (order.pickup_latitude && order.pickup_longitude) {
        const el = createMarkerEl('pickup', order.status, order.order_number, isMobile);
        el.onclick = () => { onOrderSelect?.(order.id); };
        const popup = new mb.Popup({ offset: 15, closeButton: false, maxWidth: isMobile ? '200px' : '240px' })
          .setHTML(createPopupHTML(order, 'pickup'));
        const marker = mapRef.current?.addMarker([order.pickup_longitude, order.pickup_latitude], el);
        if (marker) marker.setPopup(popup);
        bounds.extend([order.pickup_longitude, order.pickup_latitude]);
        hasCoords = true;
      }

      // Delivery marker
      if (order.delivery_latitude && order.delivery_longitude) {
        const el = createMarkerEl('delivery', order.status, order.order_number, isMobile);
        el.onclick = () => { onOrderSelect?.(order.id); };
        const popup = new mb.Popup({ offset: 15, closeButton: false, maxWidth: isMobile ? '200px' : '240px' })
          .setHTML(createPopupHTML(order, 'delivery'));
        const marker = mapRef.current?.addMarker([order.delivery_longitude, order.delivery_latitude], el);
        if (marker) marker.setPopup(popup);
        bounds.extend([order.delivery_longitude, order.delivery_latitude]);
        hasCoords = true;
      }

      // Route line
      if (order.pickup_latitude && order.pickup_longitude && order.delivery_latitude && order.delivery_longitude) {
        routeFeatures.push({
          type: 'Feature',
          properties: { color, orderId: order.id },
          geometry: { type: 'LineString', coordinates: [[order.pickup_longitude, order.pickup_latitude], [order.delivery_longitude, order.delivery_latitude]] },
        });
      }
    });

    if (routeFeatures.length > 0) {
      map.addSource('order-routes', { type: 'geojson', data: { type: 'FeatureCollection', features: routeFeatures } });
      map.addLayer({
        id: 'order-routes-layer', type: 'line', source: 'order-routes',
        paint: { 'line-color': ['get', 'color'], 'line-width': isMobile ? 1.5 : 2, 'line-dasharray': [4, 3], 'line-opacity': 0.6 },
      });
    }

    // Include driver locations in initial bounds
    driverLocations.forEach((dl) => {
      bounds.extend([dl.longitude, dl.latitude]);
      hasCoords = true;
    });

    if (hasCoords) {
      map.fitBounds(bounds, { padding: isMobile ? 40 : 60, maxZoom: 11 });
    }

    const handleEdit = (e: Event) => {
      const orderId = (e as CustomEvent).detail;
      if (orderId) window.location.href = `/orders/edit/${orderId}`;
    };
    window.addEventListener('map-order-edit', handleEdit);
    map.on('remove', () => { window.removeEventListener('map-order-edit', handleEdit); });
  }, [orders, onOrderSelect, isMobile, driverLocations]);

  // Update driver markers reactively
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.loaded()) return;

    const currentIds = new Set(driverLocations.map((d) => d.driver_id));
    const existing = driverMarkersRef.current;

    // Remove stale markers
    existing.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    });

    // Add or update markers
    driverLocations.forEach((dl) => {
      const isRecent = Date.now() - new Date(dl.recorded_at).getTime() < 5 * 60 * 1000;
      const existingMarker = existing.get(dl.driver_id);

      if (existingMarker) {
        existingMarker.setLngLat([dl.longitude, dl.latitude]);
        existingMarker.getPopup()?.setHTML(createDriverPopupHTML(dl));
      } else {
        loadMapboxGL().then(mb => {
          const el = createDriverMarkerEl(dl.driver_name, dl.heading, isRecent);
          const popup = new mb.Popup({ offset: 18, closeButton: false, maxWidth: '220px' })
            .setHTML(createDriverPopupHTML(dl));
          const marker = new mb.Marker({ element: el })
            .setLngLat([dl.longitude, dl.latitude])
            .setPopup(popup)
            .addTo(map);
          existing.set(dl.driver_id, marker);
        });
      }
    });
  }, [driverLocations]);

  // Cleanup driver markers on unmount
  useEffect(() => {
    return () => {
      driverMarkersRef.current.forEach((m) => m.remove());
      driverMarkersRef.current.clear();
    };
  }, []);

  if (ordersWithCoords.length === 0) {
    return (
      <div
        className={`rounded-xl border border-border/30 bg-muted/20 p-6 text-center ${className || ''}`}
      >
        <p className="text-sm text-muted-foreground">
          Geen orders met coördinaten gevonden. Voeg adressen toe om de kaart te gebruiken.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-border/30 shadow-lg ${className || ''}`}
    >
      <BaseMap
        ref={mapRef} style="streets" zoom={7}
        showGeolocate={false} showNavigation={true} showTraffic={false}
        onLoad={handleMapLoad} className="w-full h-full"
      />
      <MapLegend isMobile={isMobile} hasDrivers={driverLocations.length > 0} />
    </div>
  );
};

export default OrderLocationMap;
