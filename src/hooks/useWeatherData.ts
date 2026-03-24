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

// Simulated weather data based on time of day and season
// In production, this would connect to a real weather API like OpenWeatherMap
export function useWeatherData(location: string = 'Nederland') {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      
      const now = new Date();
      const hour = now.getHours();
      const month = now.getMonth();
      
      // Seasonal temperature ranges (Netherlands)
      const seasonalTemp = (() => {
        if (month >= 11 || month <= 1) return { min: -2, max: 8 }; // Winter
        if (month >= 2 && month <= 4) return { min: 5, max: 15 }; // Spring
        if (month >= 5 && month <= 7) return { min: 15, max: 28 }; // Summer
        return { min: 8, max: 18 }; // Autumn
      })();
      
      // Generate realistic temperature
      const baseTemp = seasonalTemp.min + Math.random() * (seasonalTemp.max - seasonalTemp.min);
      const temperature = Math.round(baseTemp);
      
      // Weather conditions based on season
      const conditions: Array<{ condition: string; icon: WeatherData['icon']; weight: number }> = (() => {
        if (month >= 11 || month <= 1) {
          return [
            { condition: 'Bewolkt', icon: 'cloudy', weight: 40 },
            { condition: 'Regen', icon: 'rainy', weight: 30 },
            { condition: 'Mist', icon: 'foggy', weight: 15 },
            { condition: 'Sneeuw', icon: 'snowy', weight: 10 },
            { condition: 'Zonnig', icon: 'sunny', weight: 5 },
          ];
        }
        if (month >= 5 && month <= 7) {
          return [
            { condition: 'Zonnig', icon: 'sunny', weight: 45 },
            { condition: 'Halfbewolkt', icon: 'partly-cloudy', weight: 30 },
            { condition: 'Bewolkt', icon: 'cloudy', weight: 15 },
            { condition: 'Onweer', icon: 'stormy', weight: 5 },
            { condition: 'Regen', icon: 'rainy', weight: 5 },
          ];
        }
        return [
          { condition: 'Halfbewolkt', icon: 'partly-cloudy', weight: 30 },
          { condition: 'Bewolkt', icon: 'cloudy', weight: 30 },
          { condition: 'Regen', icon: 'rainy', weight: 25 },
          { condition: 'Zonnig', icon: 'sunny', weight: 15 },
        ];
      })();
      
      // Weighted random selection
      const totalWeight = conditions.reduce((sum, c) => sum + c.weight, 0);
      let random = Math.random() * totalWeight;
      const selectedCondition = conditions.find(c => {
        random -= c.weight;
        return random <= 0;
      }) || conditions[0];
      
      // Traffic estimation based on time of day and weather
      const trafficData = (() => {
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);
        const isBadWeather = ['rainy', 'snowy', 'foggy', 'stormy'].includes(selectedCondition.icon);
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        
        if (isWeekend) {
          return {
            level: 'low' as const,
            description: 'Weinig verkeer verwacht',
          };
        }
        
        if (isRushHour && isBadWeather) {
          return {
            level: 'severe' as const,
            description: 'Zware files verwacht door weer',
          };
        }
        
        if (isRushHour) {
          return {
            level: 'high' as const,
            description: 'Files verwacht in de spits',
          };
        }
        
        if (isBadWeather) {
          return {
            level: 'moderate' as const,
            description: 'Mogelijk vertraging door weer',
          };
        }
        
        return {
          level: 'low' as const,
          description: 'Vlot verkeer verwacht',
        };
      })();
      
      setWeather({
        temperature,
        condition: selectedCondition.condition,
        icon: selectedCondition.icon,
        humidity: Math.round(50 + Math.random() * 40),
        windSpeed: Math.round(5 + Math.random() * 25),
        trafficExpected: trafficData.level,
        trafficDescription: trafficData.description,
        location,
      });
      
      setLoading(false);
    };
    
    fetchWeather();
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [location]);
  
  return { weather, loading };
}