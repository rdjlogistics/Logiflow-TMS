export type NavApp = 'google' | 'waze' | 'apple';

export function googleMapsUrl(destination: string, origin?: string, waypoints?: string[]): string {
  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'driving',
  });
  if (origin) params.set('origin', origin);
  if (waypoints && waypoints.length > 0) params.set('waypoints', waypoints.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function wazeUrl(destination: string, lat?: number | null, lng?: number | null): string {
  if (lat != null && lng != null) {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;
}

export function appleMapsUrl(destination: string, lat?: number | null, lng?: number | null): string {
  if (lat != null && lng != null) {
    return `https://maps.apple.com/?daddr=${lat},${lng}`;
  }
  return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}`;
}

export function openNavigation(app: NavApp, destination: string, lat?: number | null, lng?: number | null): void {
  let url: string;
  switch (app) {
    case 'google':
      url = googleMapsUrl(destination);
      break;
    case 'waze':
      url = wazeUrl(destination, lat, lng);
      break;
    case 'apple':
      url = appleMapsUrl(destination, lat, lng);
      break;
  }
  window.open(url, '_blank');
}

export function isAppleMapsAvailable(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod|Mac/.test(navigator.userAgent);
}

export interface NavStop {
  address: string;
  city: string;
  lat: number;
  lng: number;
}

export function wazeMultiStopUrls(stops: NavStop[]): string[] {
  return stops.map((s) =>
    s.lat && s.lng
      ? `https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(`${s.address}, ${s.city}`)}&navigate=yes`
  );
}

export function appleMapsMultiStopUrls(stops: NavStop[]): string[] {
  return stops.map((s) =>
    s.lat && s.lng
      ? `https://maps.apple.com/?daddr=${s.lat},${s.lng}`
      : `https://maps.apple.com/?daddr=${encodeURIComponent(`${s.address}, ${s.city}`)}`
  );
}
