// T055: the step has no place map (removed at the owner's request); Live mode's card still draws one.
import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

test("Tawaf step shows no place map", async ({ page }) => {
  await onboard(page, "English");
  await page.locator(".nav-item").nth(1).click();
  await page.locator(".all-steps:not([open]) summary").click();
  await page.locator(".steps button").nth(2).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(page.locator(".place-visual")).toHaveCount(0);
  await expect(page.locator(".instruction-card .kaaba-diagram")).toBeVisible();
});
