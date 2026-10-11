import { useCallback, useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { SITES } from "../data/sites";
import type { Site } from "../data/sites";
import { adviceFor, fetchWeather } from "../data/weather";
import type { Weather } from "../data/weather";
import { useT } from "../i18n";

type WeatherState = { status: "loading" } | { status: "offline" } | { status: "failed" } | { status: "ready"; weather: Weather };

/** T058 (FR-034): weather advice, typical busy times and main facilities for each site. Nothing here is saved. */
export function Sites() {
  const t = useT();
  const [weather, setWeather] = useState<Record<string, WeatherState>>({});
  const [reload, setReload] = useState(0);

  const load = useCallback(
    (signal: AbortSignal) => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setWeather(Object.fromEntries(SITES.map((s) => [s.id, { status: "offline" } as WeatherState])));
        return;
      }
      setWeather(Object.fromEntries(SITES.map((s) => [s.id, { status: "loading" } as WeatherState])));
      for (const site of SITES) {
        fetchWeather(site, signal)
          .then((w) => setWeather((prev) => ({ ...prev, [site.id]: { status: "ready", weather: w } })))
          .catch(() => {
            if (!signal.aborted) setWeather((prev) => ({ ...prev, [site.id]: { status: "failed" } }));
          });
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, reload]);

  return (
    <main className="page sites-page">
      <h1>{t.sites.title}</h1>
      <p className="sites-intro">{t.sites.intro}</p>
      <p className="sites-pending"><Icon name="shield" size={16} />{t.sites.pending}</p>
      <div className="sites-actions">
        <button type="button" className="live-off" onClick={() => setReload((n) => n + 1)}>{t.sites.refresh}</button>
        <small>{t.sites.privacy}</small>
      </div>
      {SITES.map((site) => (
        <SiteCard key={site.id} site={site} state={weather[site.id] ?? { status: "loading" }} />
      ))}
    </main>
  );
}

function SiteCard({ site, state }: { site: Site; state: WeatherState }) {
  const t = useT();
  const s = t.sites;
  return (
    <section className="site-card" aria-labelledby={`site-${site.id}`}>
      <h2 id={`site-${site.id}`}>{s.names[site.id]}</h2>

      <h3>{s.weather}</h3>
      {state.status === "loading" && <p role="status">{s.loading}</p>}
      {state.status === "offline" && <p>{s.offline}</p>}
      {state.status === "failed" && <p role="alert">{s.failed}</p>}
      {state.status === "ready" && (
        <>
          <p className="site-temp">
            <strong>{Math.round(state.weather.temperature)}°C</strong>
            <span>{s.feels.replace("{n}", String(Math.round(state.weather.feelsLike)))}</span>
          </p>
          <ul className="site-facts">
            <li>{s.high.replace("{n}", String(Math.round(state.weather.maxFeelsLike)))}</li>
            <li>{s.humidity.replace("{n}", String(Math.round(state.weather.humidity)))}</li>
            <li>{s.wind.replace("{n}", String(Math.round(state.weather.windKmh)))}</li>
            <li>{s.uv.replace("{n}", String(Math.round(Math.max(state.weather.uvIndex, state.weather.maxUv))))}</li>
            <li>{s.rain.replace("{n}", String(Math.round(state.weather.rainChance)))}</li>
          </ul>
          <ul className="site-advice">
            {adviceFor(state.weather).map((key) => <li key={key}>{s.advice[key]}</li>)}
          </ul>
        </>
      )}

      <h3>{s.crowd}</h3>
      <p><strong>{s.busiest}:</strong> {s.busy[site.id]}</p>
      <p><strong>{s.quieter}:</strong> {s.quiet[site.id]}</p>
      <small>{s.crowdNote}</small>

      <h3>{s.facilitiesTitle}</h3>
      <ul className="site-facilities">
        {site.facilities.map((key) => <li key={key}>{s.facilities[key as keyof typeof s.facilities]}</li>)}
      </ul>
      <small>{s.facilitiesNote}</small>
    </section>
  );
}
