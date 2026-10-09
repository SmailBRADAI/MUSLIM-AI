// T049: the Umrah illustrations (miqat map, ihram clothing and rules, Tawaf route, Sa'i track) in each language:
// visible, named by their reviewed text, accessible (axe) and with no sideways scroll on a narrow screen.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import arTexts from "../../content/i18n/ar/umrah.json" with { type: "json" };
import enTexts from "../../content/i18n/en/umrah.json" with { type: "json" };
import urTexts from "../../content/i18n/ur/umrah.json" with { type: "json" };
import { onboard } from "./helpers";

const languages = [
  { button: "العربية", texts: arTexts },
  { button: "English", texts: enTexts },
  { button: "اردو", texts: urTexts },
] as const;

async function openStep(page: Page, n: number) {
  await page.locator(".nav-item").nth(1).click();
  await page.locator(".steps button").nth(n - 1).click();
}

async function expectAccessibleAndNarrow(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(await fits()).toBe(true);
  // 200% zoom on a phone leaves about half the width: still no sideways scroll.
  await page.setViewportSize({ width: 206, height: 457 });
  expect(await fits()).toBe(true);
}

for (const { button, texts } of languages) {
  test.describe(button, () => {
    test.beforeEach(async ({ page }) => {
      await onboard(page, button);
    });

    test("miqat map and ihram clothing on the Ihram step", async ({ page }) => {
      await openStep(page, 1);
      const map = page.locator(".instruction-card .miqat-map");
      await expect(map).toBeVisible();
      await expect(map).toHaveAttribute("dir", "ltr");
      await expect(map).toHaveAccessibleName(texts["umrah.ihram"].diagramLabel);
      await expect(page.locator(".miqat-legend li")).toHaveCount(5);
      await expect(page.locator(".miqat-legend")).toContainText(texts["umrah.ihram"].diagramItems["miqat.5.for"]);
      await expect(page.locator(".instruction-card .dress-grid")).toBeVisible();
      await expect(page.getByText(texts["umrah.ihram"].diagramItems["ihram-dress.caption"])).toBeVisible();
      await expectAccessibleAndNarrow(page);
    });

    test("prohibitions and permitted things on their own step", async ({ page }) => {
      await openStep(page, 2);
      await expect(page.locator(".rules-grid li")).toHaveCount(12);
      await expect(page.locator(".rules-list li")).toHaveCount(10);
      await expect(page.locator(".rules-head").first()).toHaveText(texts["umrah.ihram-rules"].diagramItems["ihram-rules.prohibited"]);
      await expect(page.locator(".rules-head.ok")).toHaveText(texts["umrah.ihram-rules"].diagramItems["ihram-rules.permitted"]);
      await expectAccessibleAndNarrow(page);
    });

    test("Tawaf route with the Kaaba on the left and the Hijr", async ({ page }) => {
      await openStep(page, 3);
      const drawing = page.locator(".instruction-card .kaaba-diagram");
      await expect(drawing).toBeVisible();
      await expect(drawing).toHaveAttribute("data-direction", "counterclockwise");
      await expect(drawing).toHaveAccessibleName(texts["umrah.tawaf"].diagramLabel);
      await expect(page.locator(".diagram-legend")).toContainText(texts["umrah.tawaf"].diagramItems["tawaf.invalid"]);
      await expectAccessibleAndNarrow(page);
    });

    test("Sa'i track with the green markers and the zone where men run", async ({ page }) => {
      await openStep(page, 5);
      const drawing = page.locator(".instruction-card .sai-diagram");
      await expect(drawing).toBeVisible();
      await expect(drawing).toHaveAccessibleName(texts["umrah.sai"].diagramLabel);
      await expect(page.locator(".sai-post")).toHaveCount(2);
      await expect(page.locator(".sai-legend")).toContainText(texts["umrah.sai"].diagramItems["sai.menRun"]);
      await expectAccessibleAndNarrow(page);
    });
  });
}
