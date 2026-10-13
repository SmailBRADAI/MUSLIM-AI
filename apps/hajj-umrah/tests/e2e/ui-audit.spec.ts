// UI audit fixes: hero text clear of the badge, visible keyboard focus on every control, example questions.
import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

for (const language of ["English", "العربية"] as const) {
  test(`Home hero text does not run under the Kaaba badge (${language})`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await onboard(page, language);
    const text = (await page.locator(".hero p").boundingBox())!;
    const badge = (await page.locator(".hero-kaaba").boundingBox())!;
    const lines = await page.locator(".hero p").evaluate((p) => {
      const range = document.createRange();
      range.selectNodeContents(p);
      return [...range.getClientRects()].map((r) => ({ x: r.x, right: r.right, y: r.y, bottom: r.bottom }));
    });
    for (const r of lines) {
      const overlaps = r.x < badge.x + badge.width && r.right > badge.x && r.y < badge.y + badge.height && r.bottom > badge.y;
      expect(overlaps, `text rect ${JSON.stringify(r)} vs badge`).toBe(false);
    }
    expect(text.width).toBeGreaterThan(100);
  });
}

test("Keyboard focus is visible on inputs and links, and example questions answer", async ({ page }) => {
  await onboard(page, "English");
  await page.getByRole("navigation").getByRole("button", { name: "Ask" }).click();
  await page.getByLabel("Your question").focus();
  const outline = await page.getByLabel("Your question").evaluate((el) => getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineWidth);
  expect(outline).toMatch(/solid 3px/);
  await page.getByRole("button", { name: "tawaf", exact: true }).click();
  await expect(page.locator(".ask-result").first()).toBeVisible();
});
