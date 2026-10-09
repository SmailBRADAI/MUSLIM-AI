import type { Page } from "@playwright/test";

export const CONTINUE = /^(متابعة|Continue|جاری رکھیں)/;
export const UMRAH = /^(مناسك العمرة|Umrah rituals|مناسکِ عمرہ)/;

/** Fresh install: choose a language, then Umrah, and land on Home. */
export async function onboard(page: Page, language: "العربية" | "English" | "اردو") {
  await page.goto("/");
  await page.getByRole("button", { name: language, exact: true }).click();
  await page.getByRole("button", { name: CONTINUE }).click();
  await page.getByRole("button", { name: UMRAH }).click();
  await page.getByRole("navigation").waitFor();
}
