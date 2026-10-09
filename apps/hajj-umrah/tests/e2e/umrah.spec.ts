// T024: the whole Umrah, offline, in each language (spec SC-001, SC-004).
import { expect, test } from "@playwright/test";
import arTexts from "../../content/i18n/ar/umrah.json" with { type: "json" };
import enTexts from "../../content/i18n/en/umrah.json" with { type: "json" };
import urTexts from "../../content/i18n/ur/umrah.json" with { type: "json" };
import ar from "../../src/i18n/ar.json" with { type: "json" };
import en from "../../src/i18n/en.json" with { type: "json" };
import ur from "../../src/i18n/ur.json" with { type: "json" };
import { onboard } from "./helpers";

const STEPS = ["umrah.ihram", "umrah.tawaf", "umrah.tawaf-prayer", "umrah.sai", "umrah.halq"] as const;
const languages = [
  { button: "العربية", ui: ar, texts: arTexts },
  { button: "English", ui: en, texts: enTexts },
  { button: "اردو", ui: ur, texts: urTexts },
] as const;

for (const { button, ui, texts } of languages) {
  test(`full Umrah offline in ${button}`, async ({ page, context }) => {
    await onboard(page, button);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();

    await page.getByRole("navigation").getByRole("button", { name: ui.guide }).click();
    for (const [i, id] of STEPS.entries()) {
      await expect(page.getByRole("heading", { level: 1, name: texts[id].title })).toBeVisible();
      await expect(page.getByText(`${i + 1} / ${STEPS.length}`)).toBeVisible();
      await page.getByRole("button", { name: ui.complete }).click();
    }
    // The last step stays open, marked done; the write finished before the UI changed.
    await expect(page.getByRole("button", { name: ui.stepDone, exact: true })).toBeDisabled();
    await expect(page.getByText("100%")).toBeVisible();

    await page.reload();
    await expect(page.getByText(ui.allStepsDone)).toBeVisible();
    await expect(page.getByText("100%")).toBeVisible();
  });
}
