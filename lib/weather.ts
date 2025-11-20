/**
 * Free weather API integration using Open-Meteo
 * No API key required!
 */

export interface WeatherData {
  temperature: number;
  precipitation: number;
  conditions: string;
  layeringRecommendation: string[];
}

export async function getWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,weather_code&temperature_unit=fahrenheit`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch weather data");
  }

  const data = await response.json();
  const temp = data.current.temperature_2m;
  const precipitation = data.current.precipitation || 0;
  const weatherCode = data.current.weather_code;

  return {
    temperature: temp,
    precipitation,
    conditions: getWeatherCondition(weatherCode),
    layeringRecommendation: getLayeringRecommendation(temp, precipitation),
  };
}

function getWeatherCondition(code: number): string {
  // WMO Weather interpretation codes
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rainy";
  if (code <= 86) return "Snowy";
  return "Stormy";
}

function getLayeringRecommendation(temp: number, precipitation: number): string[] {
  const layers: string[] = [];

  // Base layer (always needed)
  layers.push("base");

  // Mid layer based on temperature
  if (temp < 65) {
    layers.push("mid");
  }

  // Outer layer for cold or rain
  if (temp < 50 || precipitation > 0) {
    layers.push("outer");
  }

  return layers;
}

export async function getWeatherBasedOutfitSuggestion(
  latitude: number,
  longitude: number
): Promise<{
  weather: WeatherData;
  suggestion: string;
  requiredLayers: string[];
}> {
  const weather = await getWeather(latitude, longitude);

  let suggestion = "";

  if (weather.temperature > 75) {
    suggestion = "It's hot! Go for light, breathable fabrics. Consider shorts and a t-shirt.";
  } else if (weather.temperature > 65) {
    suggestion = "Perfect weather! A light outfit with a single layer should work great.";
  } else if (weather.temperature > 50) {
    suggestion = "It's a bit cool. Layer up with a light jacket or sweater.";
  } else if (weather.temperature > 35) {
    suggestion = "Cold outside! You'll want multiple layers and a warm jacket.";
  } else {
    suggestion = "It's freezing! Bundle up with your warmest clothes.";
  }

  if (weather.precipitation > 0) {
    suggestion += " Don't forget a rain jacket or umbrella!";
  }

  return {
    weather,
    suggestion,
    requiredLayers: weather.layeringRecommendation,
  };
}
