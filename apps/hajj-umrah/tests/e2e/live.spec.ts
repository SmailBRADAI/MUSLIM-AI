// T048: Live mode with a simulated location (Playwright geolocation emulation and permissions).
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import ar from "../../src/i18n/ar.json" with { type: "json" };
import en from "../../src/i18n/en.json" with { type: "json" };
import { CONTINUE, onboard } from "./helpers";

const MATAF = { latitude: 21.4225, longitude: 39.8258, accuracy: 10 };
const ARAFAH = { latitude: 21.3549, longitude: 39.9842, accuracy: 20 };

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

const openGuide = async (page: Page) => {
  await page.locator(".nav-item").nth(1).click();
  await page.locator(".guide-settings summary").click();
};

test.describe("in the Mataf", () => {
  test.use({ geolocation: MATAF, permissions: ["geolocation"] });

  test("Arabic Umrah: off by default, then suggests Tawaf and opens it without marking anything done", async ({ page }) => {
    await onboard(page, "العربية");
    await openGuide(page);
    const live = page.getByRole("switch", { name: ar.live.title });
    await expect(live).toHaveAttribute("aria-checked", "false");
    await expect(page.locator(".live-card")).toContainText(ar.live.privacy);
    await expect(page.locator(".place-visual")).toHaveCount(1);

    await live.click();
    const card = page.locator(".live-card");
    await expect(card.locator("figcaption")).toHaveText(ar.live.regions.mataf);
    await expect(card.locator(".place-part.here")).toHaveAttribute("data-part", "mataf");
    await expect(card.locator(".live-suggestion strong")).toHaveText("الطواف");
    await expect(card).toContainText(ar.live.onlySuggests);
    await expect(card).not.toContainText(ar.live.checkSigns);
    await expectAccessible(page);

    await card.getByRole("button", { name: ar.live.goToStep }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("الطواف");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(card.getByText(ar.live.openNow)).toBeVisible();
    await expect(page.locator(".all-steps summary strong")).toHaveText("0%");

    // Turning it off removes the place and the suggestion.
    await live.click();
    await expect(card.locator("figcaption")).toHaveCount(0);
  });
});

test.describe("at Arafah", () => {
  test.use({ geolocation: ARAFAH, permissions: ["geolocation"] });

  test("English Hajj Tamattu': seems near Arafah, check the signs, suggests the standing", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "English", exact: true }).click();
    await page.getByRole("button", { name: CONTINUE }).click();
    await page.getByRole("button", { name: /^Hajj rituals/ }).click();
    await page.getByRole("button", { name: "Hajj Tamattu’" }).click();
    await page.getByRole("navigation").waitFor();
    await openGuide(page);

    await page.getByRole("switch", { name: en.live.title }).click();
    const card = page.locator(".live-card");
    await expect(card.locator("figcaption")).toHaveText(en.live.regions.arafah);
    await expect(card.getByText(en.live.checkSigns)).toBeVisible();
    await expect(card.locator(".live-suggestion strong")).toHaveText("Standing at Arafah");
    await expect(card).toContainText("© OpenStreetMap contributors");
    await expectAccessible(page);

    await card.getByRole("button", { name: en.live.goToStep }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Standing at Arafah");

    // Narrow screen with large text: no sideways scroll.
    await page.setViewportSize({ width: 206, height: 457 });
    await expect(card.locator("figcaption")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe("without permission", () => {
  test.use({ permissions: [] });

  test("explains that location is off and turns live mode off", async ({ page }) => {
    await onboard(page, "English");
    await openGuide(page);
    const live = page.getByRole("switch", { name: en.live.title });
    await live.click();
    await expect(page.locator(".live-card")).toContainText(en.live.errors.denied);
    await expectAccessible(page);
    await page.getByRole("button", { name: en.live.turnOff }).click();
    await expect(live).toHaveAttribute("aria-checked", "false");
    await expect(live).toBeFocused();
  });
});
