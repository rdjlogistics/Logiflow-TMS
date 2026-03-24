import { useEffect, useRef, useState, useCallback } from "react";
import type mapboxgl from "mapbox-gl";
import { getParkingLocations } from "@/services/parking";
import type { ParkingLocation } from "@/services/parking/types";

interface ParkingLayerProps {
  map: mapboxgl.Map | null;
  visible: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onParkingClick?: (location: ParkingLocation) => void;
}

const PARKING_SOURCE_ID = "parking-locations";
const PARKING_LAYER_ID = "parking-locations-layer";
const PARKING_CLUSTER_LAYER_ID = "parking-clusters";
const PARKING_CLUSTER_COUNT_LAYER_ID = "parking-cluster-count";

export function ParkingLayer({ map, visible, userLocation, onParkingClick }: ParkingLayerProps) {
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const sourceAddedRef = useRef(false);

  // Load parking data
  useEffect(() => {
    const loadData = async () => {
      // Default to center of Europe if no user location
      const lat = userLocation?.lat ?? 51.0;
      const lng = userLocation?.lng ?? 9.0;
      const locs = await getParkingLocations(lat, lng, 500); // Large radius for demo
      setLocations(locs);
    };
    loadData();
  }, [userLocation]);

  // Add/remove parking layer
  useEffect(() => {
    if (!map || locations.length === 0) return;

    const setupLayer = () => {
      // Toggle existing layers
      if (sourceAddedRef.current) {
        const visibility = visible ? "visible" : "none";
        [PARKING_LAYER_ID, PARKING_CLUSTER_LAYER_ID, PARKING_CLUSTER_COUNT_LAYER_ID].forEach((layerId) => {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", visibility);
          }
        });
        return;
      }

      if (!visible) return;

      // Create GeoJSON
      const geoJSON: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: locations.map((loc) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [loc.longitude, loc.latitude],
          },
          properties: {
            id: loc.id,
            name: loc.name,
            type: loc.type,
            isSecured: loc.isSecured,
            capacityTotal: loc.capacityTotal,
            isFree: loc.isFree,
          },
        })),
      };

      // Add source with clustering
      map.addSource(PARKING_SOURCE_ID, {
        type: "geojson",
        data: geoJSON,
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });

      // Cluster layer
      map.addLayer({
        id: PARKING_CLUSTER_LAYER_ID,
        type: "circle",
        source: PARKING_SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          visibility: visible ? "visible" : "none",
        },
        paint: {
          "circle-color": "#3b82f6",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            18, 5,
            24, 10,
            30,
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Cluster count layer
      map.addLayer({
        id: PARKING_CLUSTER_COUNT_LAYER_ID,
        type: "symbol",
        source: PARKING_SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          visibility: visible ? "visible" : "none",
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Individual parking markers
      map.addLayer({
        id: PARKING_LAYER_ID,
        type: "circle",
        source: PARKING_SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        layout: {
          visibility: visible ? "visible" : "none",
        },
        paint: {
          "circle-color": [
            "case",
            ["get", "isSecured"], "#22c55e",
            ["==", ["get", "type"], "truck"], "#3b82f6",
            "#60a5fa",
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, 4,
            12, 8,
            16, 12,
          ],
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      sourceAddedRef.current = true;

      // Click handler
      map.on("click", PARKING_LAYER_ID, (e) => {
        if (e.features && e.features.length > 0 && onParkingClick) {
          const props = e.features[0].properties;
          if (props?.id) {
            const location = locations.find((l) => l.id === props.id);
            if (location) {
              onParkingClick(location);
            }
          }
        }
      });

      // Cluster click to zoom
      map.on("click", PARKING_CLUSTER_LAYER_ID, (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [PARKING_CLUSTER_LAYER_ID],
        });
        if (features.length === 0) return;

        const clusterId = features[0].properties?.cluster_id;
        const source = map.getSource(PARKING_SOURCE_ID) as mapboxgl.GeoJSONSource;
        
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;

          const geometry = features[0].geometry;
          if (geometry.type === "Point") {
            map.easeTo({
              center: geometry.coordinates as [number, number],
              zoom: zoom ?? 10,
              duration: 500,
            });
          }
        });
      });

      // Cursor changes
      map.on("mouseenter", PARKING_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", PARKING_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", PARKING_CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", PARKING_CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
    };

    if (map.isStyleLoaded()) {
      setupLayer();
    } else {
      map.once("style.load", setupLayer);
    }

    return () => {
      // Cleanup handled by map removal
    };
  }, [map, visible, locations, onParkingClick]);

  return null;
}
