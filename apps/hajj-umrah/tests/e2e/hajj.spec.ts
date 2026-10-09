// T032: each Hajj type, walked through by day offline (spec US4), and the day view in every language.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import ifrad from "../../content/journeys/hajj-ifrad.json" with { type: "json" };
import qiran from "../../content/journeys/hajj-qiran.json" with { type: "json" };
import tamattu from "../../content/journeys/hajj-tamattu.json" with { type: "json" };
import enIfrad from "../../content/i18n/en/hajj-ifrad.json" with { type: "json" };
import enQiran from "../../content/i18n/en/hajj-qiran.json" with { type: "json" };
import enTamattu from "../../content/i18n/en/hajj-tamattu.json" with { type: "json" };
import arTamattu from "../../content/i18n/ar/hajj-tamattu.json" with { type: "json" };
import urTamattu from "../../content/i18n/ur/hajj-tamattu.json" with { type: "json" };
import ar from "../../src/i18n/ar.json" with { type: "json" };
import en from "../../src/i18n/en.json" with { type: "json" };
import ur from "../../src/i18n/ur.json" with { type: "json" };
import { CONTINUE } from "./helpers";

const HAJJ = /^(مناسك الحج|Hajj rituals|مناسکِ حج)/;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface JourneyFile {
  stages: { order: number; day?: number; steps: { id: string; order: number }[] }[];
}
/** Step ids in the order performed, each with its stage's day (if any). */
function ordered(journey: JourneyFile) {
  return [...journey.stages]
    .sort((a, b) => a.order - b.order)
    .flatMap((stage) => [...stage.steps].sort((a, b) => a.order - b.order).map((step) => ({ id: step.id, day: stage.day })));
}

async function chooseHajj(page: Page, language: string, type: string) {
  await page.goto("/");
  await page.getByRole("button", { name: language, exact: true }).click();
  await page.getByRole("button", { name: CONTINUE }).click();
  await page.getByRole("button", { name: HAJJ }).click();
  await page.getByRole("button", { name: type }).click();
  await page.getByRole("navigation").waitFor();
}

const types = [
  { name: "Hajj Tamattu’", journey: tamattu, texts: enTamattu as Record<string, { title: string }> },
  { name: "Hajj Qiran", journey: qiran, texts: enQiran as Record<string, { title: string }> },
  { name: "Hajj Ifrad", journey: ifrad, texts: enIfrad as Record<string, { title: string }> },
];

for (const { name, journey, texts } of types) {
  test(`${name}: every day offline, in order`, async ({ page, context }) => {
    await chooseHajj(page, "English", name);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();

    await page.getByRole("navigation").getByRole("button", { name: en.guide }).click();
    const steps = ordered(journey);
    for (const [i, { id, day }] of steps.entries()) {
      await expect(page.getByRole("heading", { level: 1, name: texts[id].title, exact: true })).toBeVisible();
      await expect(page.getByText(`${i + 1} / ${steps.length}`)).toBeVisible();
      if (day) await expect(page.locator(".stage-now")).toHaveText(new RegExp(`^${day} Dhu al-Hijjah · `));
      await page.getByRole("button", { name: en.complete }).click();
    }
    await expect(page.getByRole("button", { name: en.stepDone, exact: true })).toBeDisabled();
    await expect(page.getByText("100%")).toBeVisible();

    await page.reload();
    await expect(page.getByText(en.allStepsDone)).toBeVisible();
  });
}

const languages = [
  { button: "العربية", ui: ar, texts: arTamattu, dir: "rtl" },
  { button: "English", ui: en, texts: enTamattu, dir: "ltr" },
  { button: "اردو", ui: ur, texts: urTamattu, dir: "rtl" },
] as const;

for (const { button, ui, texts, dir } of languages) {
  test(`Hajj day view in ${button}: no WCAG A/AA violations, no horizontal scroll`, async ({ page }) => {
    await chooseHajj(page, button, ui.journeys["hajj-tamattu"]);
    await expect(page.locator("html")).toHaveAttribute("dir", dir);
    await page.getByRole("navigation").getByRole("button", { name: ui.guide }).click();

    // The Umrah's Tawaf, Arafah (day 9) and the Hajj Sa'i (day 10, with its diagram).
    for (const id of ["hajj-tamattu.umrah-tawaf", "hajj-tamattu.arafah", "hajj-tamattu.sai"] as const) {
      await page.getByRole("button", { name: new RegExp(`^\\d+\\. ${escape(texts[id].title)}$`) }).click();
      await expect(page.getByRole("heading", { level: 1, name: texts[id].title, exact: true })).toBeFocused();
      await page.getByRole("button", { name: ui.details }).click();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      expect(results.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await expect(page.locator(".stage-now")).toHaveText(`${ui.days["10"].date} · ${ui.days["10"].name}`);
    // Every step button keeps a 44px touch target inside the day groups (constitution IV).
    for (const box of await page.locator(".stage-groups .steps button").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
}
