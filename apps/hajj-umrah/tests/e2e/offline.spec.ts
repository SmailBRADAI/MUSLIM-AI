import { expect, test } from "@playwright/test";

test("works in airplane mode after one online visit, fonts included", async ({ page, context }) => {
  await page.goto("/");
  // Wait until the service worker is active, which happens only after precaching finished.
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator("h1").first()).toHaveText("رفيقك في رحلةٍ مباركة");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Noto Naskh Arabic"', "س"))).toBe(true);

  await page.getByRole("button", { name: "اردو", exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Noto Nastaliq Urdu"', "س"))).toBe(true);

  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: /Umrah rituals/ }).click();
  await expect(page.getByRole("heading", { name: "Tawaf around the Kaaba" })).toBeVisible();
});

test("progress survives a reload offline", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);

  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: /Umrah rituals/ }).click();
  await page.getByRole("button", { name: /Mark complete/ }).click();
  await page.reload();
  await page.getByRole("button", { name: /My guide/ }).click();
  await expect(page.getByText("3 / 5")).toBeVisible();
});
