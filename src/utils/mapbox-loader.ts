import type mapboxgl from 'mapbox-gl';

let _mb: typeof mapboxgl | null = null;
let _loading: Promise<typeof mapboxgl> | null = null;

/**
 * Dynamically load mapbox-gl and its CSS. Caches the module after first load.
 * Resets on failure so the next call can retry.
 */
export async function loadMapboxGL(): Promise<typeof mapboxgl> {
  if (_mb) return _mb;
  if (_loading) return _loading;
  _loading = import('mapbox-gl').then(async (m) => {
    await Promise.all([
      import('mapbox-gl/dist/mapbox-gl.css'),
      import('@/styles/map-styles.css'),
    ]);
    _mb = m.default;
    return _mb;
  }).catch((err) => {
    _loading = null; // Reset so next call can retry
    throw err;
  });
  return _loading;
}
