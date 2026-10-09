import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { CONTINUE, onboard } from "./helpers";

const languages = [
  { button: "العربية", lang: "ar", dir: "rtl", hajj: /^مناسك الحج/, tamattu: /حج التمتع/, guide: "دليلي", umrahStage: "العمرة" },
  { button: "English", lang: "en", dir: "ltr", hajj: /^Hajj rituals/, tamattu: /Hajj Tamattu/, guide: "My guide", umrahStage: "Umrah" },
  { button: "اردو", lang: "ur", dir: "rtl", hajj: /^مناسکِ حج/, tamattu: /حجِ تمتع/, guide: "میری رہنمائی", umrahStage: "عمرہ" },
] as const;

for (const { button, lang, dir, hajj, tamattu, guide, umrahStage } of languages) {
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

    // The selected Hajj guide opens by day, starting with the Umrah of Tamattu'.
    await page.getByRole("navigation").getByRole("button", { name: guide }).click();
    await expect(page.locator(".instruction-card")).toBeVisible();
    await expect(page.locator(".stage-group.current .stage-name")).toHaveText(umrahStage);
  });

  test(`Umrah chosen in ${button} opens the Umrah guide`, async ({ page }) => {
    await onboard(page, button);
    await page.getByRole("navigation").getByRole("button", { name: guide }).click();
    await expect(page.locator(".instruction-card")).toBeVisible();
  });
}
