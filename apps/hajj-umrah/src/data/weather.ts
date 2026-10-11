// T058 (FR-034): today's weather at a site, from Open-Meteo (no key, no account). Only the site's fixed
// coordinates are sent, never the pilgrim's position. Advice is computed here from the numbers, as general
// comfort and safety tips; it is not ritual content.
import type { Site } from "./sites";

export interface Weather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windKmh: number;
  uvIndex: number;
  /** Today's highest values. */
  maxFeelsLike: number;
  maxUv: number;
  rainChance: number;
  precipitation: number;
}

export type AdviceKey = "extremeHeat" | "heat" | "uv" | "rain" | "wind" | "humid" | "mild";

export function weatherUrl(site: Pick<Site, "latitude" | "longitude">) {
  const params = new URLSearchParams({
    latitude: String(site.latitude),
    longitude: String(site.longitude),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,uv_index",
    daily: "apparent_temperature_max,uv_index_max,precipitation_probability_max",
    timezone: "Asia/Riyadh",
    forecast_days: "1",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/** Reads the service's answer, or throws when it does not have the expected numbers. */
export function parseWeather(data: any): Weather {
  const c = data?.current;
  const d = data?.daily;
  const n = (value: unknown) => {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("unexpected weather answer");
    return value;
  };
  return {
    temperature: n(c?.temperature_2m),
    feelsLike: n(c?.apparent_temperature),
    humidity: n(c?.relative_humidity_2m),
    windKmh: n(c?.wind_speed_10m),
    uvIndex: n(c?.uv_index),
    precipitation: n(c?.precipitation),
    maxFeelsLike: n(d?.apparent_temperature_max?.[0]),
    maxUv: n(d?.uv_index_max?.[0]),
    rainChance: n(d?.precipitation_probability_max?.[0] ?? 0),
  };
}

export async function fetchWeather(site: Site, signal?: AbortSignal): Promise<Weather> {
  const response = await fetch(weatherUrl(site), { signal });
  if (!response.ok) throw new Error(`weather service answered ${response.status}`);
  return parseWeather(await response.json());
}

/** General tips for the numbers, most important first; "mild" only when nothing else applies. */
export function adviceFor(w: Weather): AdviceKey[] {
  const advice: AdviceKey[] = [];
  const feels = Math.max(w.feelsLike, w.maxFeelsLike);
  if (feels >= 40) advice.push("extremeHeat");
  else if (feels >= 35) advice.push("heat");
  if (Math.max(w.uvIndex, w.maxUv) >= 8) advice.push("uv");
  if (w.precipitation > 0 || w.rainChance >= 40) advice.push("rain");
  if (w.windKmh >= 30) advice.push("wind");
  if (w.humidity >= 70 && feels >= 30) advice.push("humid");
  return advice.length ? advice : ["mild"];
}
