import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { CONTINUE, onboard } from "./helpers";

const languages = [
  { button: "العربية", lang: "ar", dir: "rtl", hajj: /^مناسك الحج/, tamattu: /حج التمتع/, guide: "دليلي" },
  { button: "English", lang: "en", dir: "ltr", hajj: /^Hajj rituals/, tamattu: /Hajj Tamattu/, guide: "My guide" },
  { button: "اردو", lang: "ur", dir: "rtl", hajj: /^مناسکِ حج/, tamattu: /حجِ تمتع/, guide: "میری رہنمائی" },
] as const;

for (const { button, lang, dir, hajj, tamattu, guide } of languages) {
  test(`onboarding in ${button}: direction, Hajj type, remembered after reload`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", dir);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations).toEqual([]);

    await page.getByRole("button", { name: CONTINUE }).click();
    await page.getByRole("button", { name: hajj }).click();
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: tamattu }).click();
    await expect(page.getByRole("navigation")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", dir);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // The selected Hajj guide isn't written yet, so the guide says so rather than showing Umrah steps.
    await page.getByRole("navigation").getByRole("button", { name: guide }).click();
    await expect(page.getByRole("status")).toBeVisible();
    await expect(page.locator(".instruction-card")).toHaveCount(0);
  });

  test(`Umrah chosen in ${button} opens the Umrah guide`, async ({ page }) => {
    await onboard(page, button);
    await page.getByRole("navigation").getByRole("button", { name: guide }).click();
    await expect(page.locator(".instruction-card")).toBeVisible();
  });
}
