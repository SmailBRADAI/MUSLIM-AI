// T047: the "you are here" visual shows the open step's place, offline-drawn and accessible.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import ar from "../../src/i18n/ar.json" with { type: "json" };
import en from "../../src/i18n/en.json" with { type: "json" };
import { CONTINUE, onboard } from "./helpers";

async function openStep(page: Page, n: number) {
  await page.locator(".nav-item").nth(1).click();
  await page.locator(".all-steps:not([open]) summary").click({ timeout: 1000 }).catch(() => undefined);
  await page.locator(".steps button").nth(n - 1).click();
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("Arabic Tawaf step: I am in the Mataf", async ({ page }) => {
  await onboard(page, "العربية");
  await openStep(page, 3);
  const visual = page.locator(".place-visual");
  await expect(visual.locator("figcaption")).toHaveText("أنا في المطاف");
  await expect(visual.getByRole("img")).toHaveAccessibleName(ar.placeMapLabel.replace("{place}", "المطاف"));
  await expect(visual.locator(".place-part.here")).toHaveAttribute("data-part", "mataf");
  await expect(visual.locator(".place-stop.here")).toHaveAttribute("data-stop", "makkah");
  // The Tawaf diagram stays below, in the instruction card.
  await expect(page.locator(".instruction-card .kaaba-diagram")).toBeVisible();
  await expectAccessible(page);
});

test("English Tamattu' Arafah step: I am at Arafah, also with large text on a narrow screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: CONTINUE }).click();
  await page.getByRole("button", { name: /^Hajj rituals/ }).click();
  await page.getByRole("button", { name: "Hajj Tamattu’" }).click();
  await page.getByRole("navigation").waitFor();
  await openStep(page, 8);
  const visual = page.locator(".place-visual");
  await expect(visual.locator("figcaption")).toHaveText(en.places.arafah.here);
  await expect(visual.locator(".place-stop.here")).toHaveAttribute("data-stop", "arafah");
  await expect(visual.locator(".place-label.here")).toHaveText("Arafah");
  await expect(visual.locator(".place-haram")).toHaveCount(0);
  await expectAccessible(page);

  // 200% zoom on a phone leaves about half the width in CSS pixels: still no sideways scroll,
  // and the place is still named.
  await page.setViewportSize({ width: 206, height: 457 });
  await expect(visual.locator(".place-label.here")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
