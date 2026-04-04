import { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  condition: string;
  icon: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy' | 'stormy' | 'partly-cloudy';
  humidity: number;
  windSpeed: number;
  trafficExpected: 'low' | 'moderate' | 'high' | 'severe';
  trafficDescription: string;
  location: string;
}

const WMO_MAP: Record<number, { condition: string; icon: WeatherData['icon'] }> = {
  0: { condition: 'Onbewolkt', icon: 'sunny' },
  1: { condition: 'Halfbewolkt', icon: 'partly-cloudy' },
  2: { condition: 'Halfbewolkt', icon: 'partly-cloudy' },
  3: { condition: 'Bewolkt', icon: 'cloudy' },
  45: { condition: 'Mist', icon: 'foggy' },
  48: { condition: 'Mist', icon: 'foggy' },
  51: { condition: 'Motregen', icon: 'rainy' },
  53: { condition: 'Motregen', icon: 'rainy' },
  55: { condition: 'Motregen', icon: 'rainy' },
  56: { condition: 'IJzel', icon: 'rainy' },
  57: { condition: 'IJzel', icon: 'rainy' },
  61: { condition: 'Regen', icon: 'rainy' },
  63: { condition: 'Regen', icon: 'rainy' },
  65: { condition: 'Zware regen', icon: 'rainy' },
  66: { condition: 'IJsregen', icon: 'rainy' },
  67: { condition: 'IJsregen', icon: 'rainy' },
  71: { condition: 'Sneeuw', icon: 'snowy' },
  73: { condition: 'Sneeuw', icon: 'snowy' },
  75: { condition: 'Zware sneeuw', icon: 'snowy' },
  77: { condition: 'Sneeuwkorrels', icon: 'snowy' },
  80: { condition: 'Buien', icon: 'rainy' },
  81: { condition: 'Buien', icon: 'rainy' },
  82: { condition: 'Zware buien', icon: 'rainy' },
  85: { condition: 'Sneeuwbuien', icon: 'snowy' },
  86: { condition: 'Sneeuwbuien', icon: 'snowy' },
  95: { condition: 'Onweer', icon: 'stormy' },
  96: { condition: 'Onweer met hagel', icon: 'stormy' },
  99: { condition: 'Zwaar onweer', icon: 'stormy' },
};

function mapWmoCode(code: number): { condition: string; icon: WeatherData['icon'] } {
  return WMO_MAP[code] ?? { condition: 'Bewolkt', icon: 'cloudy' };
}

function calculateTraffic(icon: WeatherData['icon']): { level: WeatherData['trafficExpected']; description: string } {
  const now = new Date();
  const hour = now.getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);
  const isBadWeather = ['rainy', 'snowy', 'foggy', 'stormy'].includes(icon);
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  if (isWeekend) return { level: 'low', description: 'Weinig verkeer verwacht' };
  if (isRushHour && isBadWeather) return { level: 'severe', description: 'Zware files verwacht door weer' };
  if (isRushHour) return { level: 'high', description: 'Files verwacht in de spits' };
  if (isBadWeather) return { level: 'moderate', description: 'Mogelijk vertraging door weer' };
  return { level: 'low', description: 'Vlot verkeer verwacht' };
}

const DEFAULT_LAT = 52.37;
const DEFAULT_LNG = 4.90;

async function getPosition(): Promise<{ lat: number; lng: number }> {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000,
      });
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=nl`,
      { headers: { 'User-Agent': 'RDJLogistics/1.0' } }
    );
    if (!res.ok) return 'Nederland';
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.state || 'Nederland';
  } catch {
    return 'Nederland';
  }
}

export function useWeatherData(location: string = 'Nederland') {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      setLoading(true);
      try {
        const { lat, lng } = await getPosition();

        const [weatherRes, locationName] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
          ),
          reverseGeocode(lat, lng),
        ]);

        if (cancelled) return;

        if (!weatherRes.ok) throw new Error('Weather API failed');

        const data = await weatherRes.json();
        const current = data.current;
        const { condition, icon } = mapWmoCode(current.weather_code);
        const traffic = calculateTraffic(icon);

        setWeather({
          temperature: Math.round(current.temperature_2m),
          condition,
          icon,
          humidity: Math.round(current.relative_humidity_2m),
          windSpeed: Math.round(current.wind_speed_10),
          trafficExpected: traffic.level,
          trafficDescription: traffic.description,
          location: locationName,
        });
      } catch {
        // Keep previous weather data if available; only clear loading
      }
      if (!cancelled) setLoading(false);
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location]);

  return { weather, loading };
}
