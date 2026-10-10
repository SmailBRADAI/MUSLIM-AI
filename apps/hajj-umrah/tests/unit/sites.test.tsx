// T058: Sites page (FR-034).
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SITES } from "../../src/data/sites";
import { adviceFor, parseWeather, weatherUrl } from "../../src/data/weather";
import type { Weather } from "../../src/data/weather";
import { I18nProvider, strings } from "../../src/i18n";
import type { Language } from "../../src/i18n";
import { Sites } from "../../src/screens/Sites";

const answer = (feels: number, extra: Record<string, number> = {}) => ({
  current: { temperature_2m: 36, apparent_temperature: feels, relative_humidity_2m: 30, wind_speed_10m: 10, precipitation: 0, uv_index: 5, ...extra },
  daily: { apparent_temperature_max: [feels + 2], uv_index_max: [9], precipitation_probability_max: [0] },
});
const base: Weather = { temperature: 30, feelsLike: 30, humidity: 30, windKmh: 5, uvIndex: 3, maxFeelsLike: 30, maxUv: 3, rainChance: 0, precipitation: 0 };

function show(language: Language = "en") {
  return render(
    <I18nProvider language={language}>
      <Sites />
    </I18nProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

describe("weather data", () => {
  it("asks only about the site's fixed coordinates", () => {
    const url = new URL(weatherUrl(SITES[0]));
    expect(url.hostname).toBe("api.open-meteo.com");
    expect(url.searchParams.get("latitude")).toBe(String(SITES[0].latitude));
    expect([...url.searchParams.keys()].sort()).toEqual(["current", "daily", "forecast_days", "latitude", "longitude", "timezone"]);
  });
  it("rejects an answer without the numbers", () => {
    expect(() => parseWeather({})).toThrow();
    expect(parseWeather(answer(38)).feelsLike).toBe(38);
  });
  it("turns numbers into advice", () => {
    expect(adviceFor({ ...base })).toEqual(["mild"]);
    expect(adviceFor({ ...base, feelsLike: 41 })).toContain("extremeHeat");
    expect(adviceFor({ ...base, feelsLike: 36, maxFeelsLike: 36 })).toContain("heat");
    expect(adviceFor({ ...base, maxUv: 9 })).toContain("uv");
    expect(adviceFor({ ...base, rainChance: 50 })).toContain("rain");
    expect(adviceFor({ ...base, windKmh: 35 })).toContain("wind");
  });
});

describe("Sites page", () => {
  it("shows weather advice, typical busy times and facilities for each site, marked as pending", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => answer(41) }));
    vi.stubGlobal("fetch", fetchMock);
    show();
    expect(screen.getByText(strings.en.sites.pending)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(strings.en.sites.advice.extremeHeat)).toHaveLength(4));
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const haram = screen.getByRole("region", { name: "Masjid al-Haram" });
    expect(within(haram).getByText("Zamzam water points")).toBeInTheDocument();
    expect(within(haram).getByText(strings.en.sites.crowdNote)).toBeInTheDocument();
    expect(within(haram).getByText(/Around the five prayers/)).toBeInTheDocument();
    for (const lang of ["ar", "ur"] as const) {
      for (const site of SITES) expect(strings[lang].sites.names[site.id].length).toBeGreaterThan(1);
    }
  });

  it("says so when the weather fails, and refreshes on request", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    show();
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(4));
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8));
  });

  it("does not call the weather service when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    show("ur");
    expect(await screen.findAllByText(strings.ur.sites.offline)).toHaveLength(4);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
