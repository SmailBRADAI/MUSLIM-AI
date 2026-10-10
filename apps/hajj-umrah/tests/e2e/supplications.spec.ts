// T054: the highlighted supplications panel on a real step.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

test("Tawaf step lists its supplications, accessibly", async ({ page }) => {
  await onboard(page, "English");
  await page.locator(".nav-item").nth(1).click();
  await page.locator(".steps button").nth(2).click();
  const panel = page.getByRole("region", { name: "Recommended supplications" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("strong").filter({ hasText: "Between the Yemeni Corner and the Black Stone" })).toBeVisible();
  await expect(panel.getByText("For this step").first()).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
