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
      await page.locator(".nav-item").last().click();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      expect(results.violations).toEqual([]);
    });

    test("guide has no WCAG A/AA violations", async ({ page }) => {
      await page.locator(".journey-card.primary").click();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
