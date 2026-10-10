// T058: the Sites page, with the weather service mocked.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

test("Sites page: weather advice, busy times and facilities, accessibly", async ({ page }) => {
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({
      json: {
        current: { temperature_2m: 38, apparent_temperature: 42, relative_humidity_2m: 20, wind_speed_10m: 12, precipitation: 0, uv_index: 7 },
        daily: { apparent_temperature_max: [44], uv_index_max: [10], precipitation_probability_max: [0] },
      },
    }),
  );
  await onboard(page, "English");
  await page.getByRole("navigation").getByRole("button", { name: "Sites" }).click();
  const haram = page.getByRole("region", { name: "Masjid al-Haram" });
  await expect(haram.getByText(/Extreme heat/)).toBeVisible();
  await expect(haram.getByText("Zamzam water points")).toBeVisible();
  await expect(page.getByRole("region", { name: "Arafah" }).getByText("Namirah mosque")).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
