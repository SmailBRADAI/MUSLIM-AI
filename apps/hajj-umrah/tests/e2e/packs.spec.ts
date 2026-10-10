// T030: downloads are verified before they count, and lost downloads are noticed.
import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

async function openOfflineSection(page: import("@playwright/test").Page) {
  await page.locator(".settings-button").click();
  await expect(page.getByRole("heading", { name: "Offline content" })).toBeVisible();
}

test("downloads the English pack and shows Ready offline, then works offline", async ({ page, context }) => {
  await onboard(page, "English");
  await openOfflineSection(page);
  await page.getByRole("listitem").filter({ hasText: "English" }).getByRole("button", { name: "Download" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "English" })).toContainText("On this device");

  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Home" }).click();
  await expect(page.getByText("Your guide is ready offline")).toBeVisible();

  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Your guide is ready offline")).toBeVisible();
  await page.getByRole("button", { name: /Umrah rituals/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ihram" })).toBeVisible();
});

test("an interrupted download is not marked ready", async ({ page }) => {
  await onboard(page, "English");
  // Every attempt is cut off halfway through the transfer.
  await page.route("**/packs/en/*/content.json", async (route) => {
    const response = await route.fetch();
    const body = await response.body();
    await route.fulfill({ status: 200, contentType: "application/json", body: body.subarray(0, body.length / 2) });
  });
  await openOfflineSection(page);
  await page.getByRole("listitem").filter({ hasText: "English" }).getByRole("button", { name: "Download" }).click();
  await expect(page.getByRole("alert")).toContainText("Download failed");
  await expect(page.getByRole("listitem").filter({ hasText: "English" })).not.toContainText("On this device");

  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Home" }).click();
  await expect(page.getByText("Download your guide for offline use")).toBeVisible();
});

test("a corrupted download is not marked ready", async ({ page }) => {
  await onboard(page, "English");
  await page.route("**/packs/en/*/content.json", async (route) => {
    const response = await route.fetch();
    // Same length, so only the checksum can catch it.
    const body = (await response.text()).replace("Tawaf", "Tawaz");
    await route.fulfill({ response, body });
  });
  await openOfflineSection(page);
  await page.getByRole("listitem").filter({ hasText: "English" }).getByRole("button", { name: "Download" }).click();
  await expect(page.getByRole("alert")).toContainText("Download failed");
});

test("cleared storage asks for the pack to be downloaded again", async ({ page }) => {
  await onboard(page, "English");
  await openOfflineSection(page);
  await page.getByRole("listitem").filter({ hasText: "English" }).getByRole("button", { name: "Download" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "English" })).toContainText("On this device");

  // The browser evicts the cached files but the app's records survive.
  await page.evaluate(async () => {
    for (const key of await caches.keys()) if (key.startsWith("rafiq-packs")) await caches.delete(key);
  });
  await page.reload();
  await expect(page.getByText(/removed from this device. Download it again/)).toBeVisible();
  await expect(page.getByText("Your guide is ready offline")).toHaveCount(0);
});

test("leaving Settings does not cancel a download", async ({ page }) => {
  await onboard(page, "English");
  await openOfflineSection(page);
  await page.getByRole("listitem").filter({ hasText: "English" }).getByRole("button", { name: "Download" }).click();
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Home" }).click();
  await page.locator(".settings-button").click();
  await expect(page.getByRole("listitem").filter({ hasText: "English" })).toContainText("On this device");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Home" }).click();
  await expect(page.getByText("Your guide is ready offline")).toBeVisible();
});
