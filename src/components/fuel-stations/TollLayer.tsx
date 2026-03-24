import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { getAllTollGeoJSON, getAllTollInfo } from "@/services/toll";
import type { TollCountryInfo } from "@/services/toll/types";

interface TollLayerProps {
  map: mapboxgl.Map | null;
  visible: boolean;
  onTollZoneClick?: (info: TollCountryInfo) => void;
}

const TOLL_SOURCE_ID = "toll-routes";
const TOLL_LAYER_ID = "toll-routes-layer";
const TOLL_OUTLINE_LAYER_ID = "toll-routes-outline";

export function TollLayer({ map, visible, onTollZoneClick }: TollLayerProps) {
  const sourceAddedRef = useRef(false);
  const [tollInfo, setTollInfo] = useState<TollCountryInfo[]>([]);
  const [geoJSON, setGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);

  // Load toll data
  useEffect(() => {
    const loadData = async () => {
      const [info, geo] = await Promise.all([
        getAllTollInfo(),
        getAllTollGeoJSON(),
      ]);
      setTollInfo(info);
      setGeoJSON(geo);
    };
    loadData();
  }, []);

  // Add/remove toll layer
  useEffect(() => {
    if (!map || !geoJSON) return;

    const setupLayer = () => {
      // Check if source already exists
      if (map.getSource(TOLL_SOURCE_ID)) {
        // Just toggle visibility
        const visibility = visible ? "visible" : "none";
        if (map.getLayer(TOLL_LAYER_ID)) {
          map.setLayoutProperty(TOLL_LAYER_ID, "visibility", visibility);
        }
        if (map.getLayer(TOLL_OUTLINE_LAYER_ID)) {
          map.setLayoutProperty(TOLL_OUTLINE_LAYER_ID, "visibility", visibility);
        }
        return;
      }

      if (!visible) return;

      // Add source
      map.addSource(TOLL_SOURCE_ID, {
        type: "geojson",
        data: geoJSON,
      });

      // Add outline layer (wider, for visibility)
      map.addLayer({
        id: TOLL_OUTLINE_LAYER_ID,
        type: "line",
        source: TOLL_SOURCE_ID,
        layout: {
          visibility: visible ? "visible" : "none",
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#8b5cf6",
          "line-width": 6,
          "line-opacity": 0.2,
        },
      });

      // Add main toll route layer
      map.addLayer({
        id: TOLL_LAYER_ID,
        type: "line",
        source: TOLL_SOURCE_ID,
        layout: {
          visibility: visible ? "visible" : "none",
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": [
            "match",
            ["get", "tollType"],
            "vignette", "#a855f7",
            "per_km", "#7c3aed",
            "per_section", "#6366f1",
            "#8b5cf6", // default
          ],
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5, 2,
            10, 4,
            15, 6,
          ],
          "line-opacity": 0.7,
          "line-dasharray": [
            "match",
            ["get", "tollType"],
            "vignette", ["literal", [4, 2]],
            ["literal", [1, 0]], // solid for other types
          ],
        },
      });

      sourceAddedRef.current = true;

      // Click handler for toll info
      map.on("click", TOLL_LAYER_ID, (e) => {
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          if (props?.countryCode && onTollZoneClick) {
            const countryInfo = tollInfo.find(
              (t) => t.countryCode === props.countryCode
            );
            if (countryInfo) {
              onTollZoneClick(countryInfo);
            }
          }
        }
      });

      // Cursor change on hover
      map.on("mouseenter", TOLL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", TOLL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
    };

    if (map.isStyleLoaded()) {
      setupLayer();
    } else {
      map.once("style.load", setupLayer);
    }

    return () => {
      // Cleanup on unmount (not on visibility change)
    };
  }, [map, visible, geoJSON, tollInfo, onTollZoneClick]);

  return null;
}
