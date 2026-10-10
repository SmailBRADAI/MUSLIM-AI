import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

const languages = [
  { button: "العربية", dir: "rtl" },
  { button: "English", dir: "ltr" },
  { button: "اردو", dir: "rtl" },
] as const;

for (const { button, dir } of languages) {
  test.describe(`${button}`, () => {
    test.beforeEach(async ({ page }) => {
      await onboard(page, button);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
    });

    test("home has no WCAG A/AA violations and no horizontal scroll", async ({ page }) => {
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      expect(results.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test("settings has no WCAG A/AA violations", async ({ page }) => {
      await page.locator(".settings-button").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      expect(results.violations).toEqual([]);
    });

    test("guide has no WCAG A/AA violations, including the Tawaf and Sa'i diagrams", async ({ page }) => {
      await page.locator(".journey-card.primary").click();
      // Steps 1 (miqat map and ihram clothing), 2 (ihram rules), 3 (Tawaf diagram) and 5 (Sa'i diagram).
      for (const n of [1, 2, 3, 5]) {
        await page.locator(".all-steps:not([open]) summary").click({ timeout: 1000 }).catch(() => undefined);
        await page.locator(".steps button").nth(n - 1).click();
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
        expect(results.violations).toEqual([]);
      }
      await expect(page.locator(".sai-diagram")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  });
}
