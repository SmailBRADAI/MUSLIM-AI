// T035, T060, T061, T062: Duas tab, lap counter, emergency card, large text, offline-capable and accessible.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

const axe = (page: import("@playwright/test").Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();

test("Duas tab lists the supplications", async ({ page }) => {
  await onboard(page, "English");
  await page.getByRole("navigation").getByRole("button", { name: "Supplications" }).click();
  await expect(page.locator(".supplication").first()).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);
});

test("Emergency card is saved on the device and survives a reload", async ({ page }) => {
  await onboard(page, "English");
  await page.getByRole("button", { name: /Emergency card/ }).click();
  await page.getByLabel("Your name").fill("Ali");
  await page.getByLabel("Group leader phone").fill("+966500000000");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved on this device")).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);
  await page.reload();
  await page.getByRole("button", { name: /Emergency card/ }).click();
  await expect(page.getByText("Ali")).toBeVisible();
});

test("Lap counter on the Tawaf step, and large text", async ({ page }) => {
  await onboard(page, "English");
  await page.getByRole("navigation").getByRole("button", { name: "Guide" }).click();
  await page.locator(".all-steps:not([open]) summary").click();
  await page.locator(".steps").getByRole("button", { name: /^.*Tawaf$/ }).first().click();
  const add = page.getByRole("button", { name: "Count a lap" });
  await add.click();
  await add.click();
  await expect(page.locator(".lap-count")).toContainText("2 of 7");
  expect((await axe(page)).violations).toEqual([]);
  await page.getByRole("button", { name: /settings/i }).first().click();
  await page.getByRole("switch", { name: "Large text" }).click();
  await expect(page.locator("html")).toHaveClass(/large-text/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
