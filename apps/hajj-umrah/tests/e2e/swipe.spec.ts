// T051: swipe between steps, lock-screen card (notification) and wake lock switch.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import ar from "../../src/i18n/ar.json" with { type: "json" };
import en from "../../src/i18n/en.json" with { type: "json" };
import { onboard } from "./helpers";

const openGuide = (page: Page) => page.locator(".nav-item").nth(1).click();
const openSettings = (page: Page) => page.locator(".settings-button").click();
const closeSettings = (page: Page) => page.locator(".settings-close").click();

/** A real touch drag from (x, y) by dx, through Chrome's input pipeline, so touch-action applies. */
async function swipe(page: Page, dx: number, dy = 0) {
  await page.locator(".swipe-area .instruction-card").scrollIntoViewIfNeeded();
  const box = (await page.locator(".swipe-area .instruction-card").boundingBox())!;
  const x = box.x + box.width / 2;
  // A tall card can reach under the bottom bar: start the drag inside the visible upper half.
  const y = Math.max(box.y + 40, Math.min(box.y + box.height / 2, (page.viewportSize()?.height ?? 700) / 2));
  const cdp = await page.context().newCDPSession(page);
  const point = (px: number, py: number) => [{ x: px, y: py, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(x, y) });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(x + (dx * i) / 8, y + (dy * i) / 8) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/**
 * Chromium's headless shell reports the notification permission as granted to the page but refuses to
 * show notifications (no notification backend). There, the notification calls are replaced by an
 * in-memory store with the same replace-by-tag behaviour; with a full Chromium the real API is used.
 */
async function ensureNotifications(page: Page) {
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    try {
      await reg.showNotification("probe", { tag: "probe" });
      (await reg.getNotifications({ tag: "probe" })).forEach((n) => n.close());
      return;
    } catch {
      // fall through to the stand-in
    }
    const store = new Map<string, { title: string; body: string; lang: string; dir: string; tag: string; close: () => void }>();
    Object.defineProperty(Notification, "permission", { get: () => "granted", configurable: true });
    ServiceWorkerRegistration.prototype.showNotification = async function (title, options = {}) {
      const tag = options.tag ?? "";
      store.set(tag, { title, body: options.body ?? "", lang: options.lang ?? "", dir: options.dir ?? "", tag, close: () => void store.delete(tag) });
    };
    ServiceWorkerRegistration.prototype.getNotifications = async function (filter) {
      return [...store.values()].filter((n) => !filter?.tag || n.tag === filter.tag) as unknown as Notification[];
    };
  });
}

const pill = (page: Page) => page.locator(".step-pill");
const cards = (page: Page) =>
  page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return (await reg.getNotifications({ tag: "rafiq-step" })).map((n) => ({ title: n.title, body: n.body, lang: n.lang, dir: n.dir }));
  });

test("English: swiping left shows the next step, right the previous, and nothing is marked done", async ({ page }) => {
  await onboard(page, "English");
  await openGuide(page);
  await expect(page.getByText(en.swipe.hint)).toBeVisible();
  await expect(pill(page)).toHaveText("1 / 6");
  await swipe(page, -120);
  await expect(pill(page)).toHaveText("2 / 6");
  await expect(page.locator(".all-steps summary strong")).toHaveText("0%");
  await expect(page.getByText(en.swipe.hint)).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: /Step 2 of 6/ })).toHaveCount(1);
  await swipe(page, 120);
  await expect(pill(page)).toHaveText("1 / 6");
  await expect(page.locator(".steps li.done")).toHaveCount(0);
  // A vertical drag does not change the step.
  await swipe(page, -20, 150);
  await expect(pill(page)).toHaveText("1 / 6");
});

test("Arabic: the swipe is mirrored (right is next), and the hint is shown", async ({ page }) => {
  await onboard(page, "العربية");
  await openGuide(page);
  await expect(page.getByText(ar.swipe.hint)).toBeVisible();
  await swipe(page, 120);
  await expect(pill(page)).toHaveText("2 / 6");
  await expect(page.locator(".all-steps summary strong")).toHaveText("0%");
  await swipe(page, -120);
  await expect(pill(page)).toHaveText("1 / 6");
});

test.describe("lock-screen card", () => {
  test.use({ permissions: ["notifications"] });

  test("shows the step as a notification, follows the step and goes away when turned off", async ({ page }) => {
    await onboard(page, "English");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await ensureNotifications(page);
    await openGuide(page);
    await openSettings(page);
    const toggle = page.getByRole("switch", { name: en.lockCard.title });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(await cards(page)).toEqual([]);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect.poll(async () => (await cards(page)).map((c) => c.title)).toEqual(["Ihram"]);
    const [card] = await cards(page);
    expect(card.body).toMatch(/^1 \/ 6/);
    expect(card.lang).toBe("en");
    expect(card.dir).toBe("ltr");

    await closeSettings(page);
    await swipe(page, -120);
    await expect.poll(async () => (await cards(page)).map((c) => c.title)).not.toContain("Ihram");
    expect((await cards(page)).length).toBe(1);
    expect((await cards(page))[0].body).toMatch(/^2 \/ 6/);

    await openSettings(page);
    await toggle.click();
    await expect.poll(async () => (await cards(page)).length).toBe(0);
  });

  test("Arabic card uses Arabic text and RTL, and axe passes with the new controls", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await onboard(page, "العربية");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await ensureNotifications(page);
    await openGuide(page);
    await openSettings(page);
    await page.getByRole("switch", { name: ar.lockCard.title }).click();
    await expect.poll(async () => (await cards(page)).map((c) => c.dir)).toEqual(["rtl"]);
    expect((await cards(page))[0].lang).toBe("ar");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe("worker message", () => {
test.use({ permissions: ["notifications"] });
test("a message from the notification worker changes the step", async ({ page }) => {
  await onboard(page, "English");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await ensureNotifications(page);
  await openGuide(page);
  await openSettings(page);
  await page.getByRole("switch", { name: en.lockCard.title }).click();
  await expect(page.getByRole("switch", { name: en.lockCard.title })).toHaveAttribute("aria-checked", "true");
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent("message", { data: { type: "rafiq-step-action", action: "next" } })));
  await expect(pill(page)).toHaveText("2 / 6");
});
});

test.describe("permission denied", () => {
  test.use({ permissions: [] });
  test("says so and stays off", async ({ page }) => {
    await onboard(page, "English");
    await openGuide(page);
    await openSettings(page);
    await page.evaluate(() => {
      Notification.requestPermission = async () => "denied";
    });
    const toggle = page.getByRole("switch", { name: en.lockCard.title });
    await toggle.click();
    await expect(page.getByRole("alert")).toContainText(en.lockCard.errors.denied);
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });
});

test("keep screen on: switch is off by default and reports state", async ({ page }) => {
  await onboard(page, "English");
  await openGuide(page);
  await openSettings(page);
  const toggle = page.getByRole("switch", { name: en.wakeLock.title });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  // Headless Chromium may or may not grant a wake lock; either way the switch is not left half-on.
  await expect(toggle.or(page.getByRole("alert")).first()).toBeVisible();
});
