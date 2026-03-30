import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface GeocodingResult {
  latitude: number;
  longitude: number;
  address: string;
}

// Country code mapping for Mapbox geocoding
const COUNTRY_CODES: Record<string, string> = {
  "Nederland": "NL",
  "België": "BE",
  "Duitsland": "DE",
  "Frankrijk": "FR",
  "Luxemburg": "LU",
  "Verenigd Koninkrijk": "GB",
  "Polen": "PL",
  "Spanje": "ES",
  "Italië": "IT",
};

export const geocodeAddress = async (
  address: string,
  postalCode?: string,
  city?: string,
  country?: string
): Promise<GeocodingResult | null> => {
  try {
    // Get Mapbox token
    const { data: tokenData } = await supabase.functions.invoke("get-mapbox-token");
    
    if (!tokenData?.token) {
      console.error("No Mapbox token available");
      return null;
    }

    const countryName = country || "Nederland";
    const countryCode = COUNTRY_CODES[countryName] || "NL";

    const fullAddress = [address, postalCode, city, countryName]
      .filter(Boolean)
      .join(", ");

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        fullAddress
      )}.json?access_token=${tokenData.token}&country=${countryCode}&limit=1`
    );

    if (!response.ok) {
      throw new Error("Geocoding request failed");
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        latitude: feature.center[1],
        longitude: feature.center[0],
        address: feature.place_name,
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  try {
    const { data: tokenData } = await supabase.functions.invoke("get-mapbox-token");
    
    if (!tokenData?.token) {
      return null;
    }

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${tokenData.token}&limit=1`
    );

    if (!response.ok) {
      throw new Error("Reverse geocoding request failed");
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }

    return null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface RouteInfo {
  distance_km: number;
  duration_minutes: number;
}

// Calculate driving distance and duration using Mapbox Directions API
export const calculateRouteDistance = async (
  pickupAddress: string,
  pickupPostalCode: string | undefined,
  pickupCity: string | undefined,
  deliveryAddress: string,
  deliveryPostalCode: string | undefined,
  deliveryCity: string | undefined
): Promise<RouteInfo | null> => {
  try {
    // First geocode both addresses
    const [pickupGeo, deliveryGeo] = await Promise.all([
      geocodeAddress(pickupAddress, pickupPostalCode, pickupCity),
      geocodeAddress(deliveryAddress, deliveryPostalCode, deliveryCity),
    ]);

    if (!pickupGeo || !deliveryGeo) {
      console.log("Could not geocode one or both addresses");
      return null;
    }

    // Get Mapbox token
    const { data: tokenData } = await supabase.functions.invoke("get-mapbox-token");
    
    if (!tokenData?.token) {
      console.error("No Mapbox token available for routing");
      return null;
    }

    // Call Mapbox Directions API
    const coordinates = `${pickupGeo.longitude},${pickupGeo.latitude};${deliveryGeo.longitude},${deliveryGeo.latitude}`;
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${tokenData.token}&overview=false`
    );

    if (!response.ok) {
      throw new Error("Directions request failed");
    }

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance_km: Math.round(route.distance / 1000 * 10) / 10, // Convert meters to km, round to 1 decimal
        duration_minutes: Math.round(route.duration / 60), // Convert seconds to minutes
      };
    }

    return null;
  } catch (error) {
    console.error("Route calculation error:", error);
    return null;
  }
};
