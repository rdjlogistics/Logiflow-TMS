import type mapboxgl from 'mapbox-gl';

let _mb: typeof mapboxgl | null = null;
let _loading: Promise<typeof mapboxgl> | null = null;

/**
 * Dynamically load mapbox-gl and its CSS. Caches the module after first load.
 * Use this instead of static `import mapboxgl from 'mapbox-gl'` to keep
 * mapbox out of page chunks that don't show a map.
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
  });
  return _loading;
}
