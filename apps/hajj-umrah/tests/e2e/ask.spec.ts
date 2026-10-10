// T059: the Ask helper finds reviewed content offline and opens the step.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

test("Ask: finds a step, shows sources, opens it in the Guide", async ({ page }) => {
  await onboard(page, "English");
  await page.getByRole("navigation").getByRole("button", { name: "Ask" }).click();
  await page.getByLabel("Your question").fill("talbiyah");
  await page.getByRole("button", { name: "Search" }).click();
  const results = page.locator(".ask-result");
  await expect(results.first()).toBeVisible();
  await expect(results.first().getByText("Sources")).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);
  await page.getByRole("button", { name: /Open this step/ }).first().click();
  await expect(page.locator(".step-hero")).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "Ask" }).click();
  await page.getByLabel("Your question").fill("zzzz");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText(/Nothing in the app's reviewed content matches/)).toBeVisible();
});
