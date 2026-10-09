// T051: the lock-screen card content, its sync with the Guide, and the wake lock.
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StepTexts } from "../../src/data/content";
import { buildCard, isCardMessage, readCardPreference, shortInstruction } from "../../src/data/lockcard";
import type { Journey, Step } from "../../src/data/types";
import { I18nProvider, strings } from "../../src/i18n";
import type { Language } from "../../src/i18n";
import { Guide } from "../../src/screens/Guide";

const step = (id: string, order: number, status: "draft" | "approved" = "draft"): Step => ({
  id,
  order,
  ruling: "wajib",
  place: "mataf",
  supplicationIds: [],
  meta: { source: ["مصدر"], status, version: "0" },
});
const text = (title: string, instruction: string, status: "draft" | "approved" = "draft") => ({ title, instruction, details: "d", mistakes: "m", review: { status } });

describe("shortInstruction", () => {
  it("keeps the first sentence", () => {
    expect(shortInstruction("Do this first. Then that.")).toBe("Do this first.");
    expect(shortInstruction("افعل هذا أولًا. ثم هذا.")).toBe("افعل هذا أولًا.");
    expect(shortInstruction("هل تنوي؟ نعم")).toBe("هل تنوي؟");
    expect(shortInstruction("یہ کریں۔ پھر وہ۔")).toBe("یہ کریں۔");
  });
  it("trims long text at a word to 140 characters with an ellipsis", () => {
    const long = `${"word ".repeat(60)}end.`;
    const out = shortInstruction(long);
    expect(out.length).toBeLessThanOrEqual(140);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor…$/);
  });
  it("does not split on a dot inside a number", () => {
    expect(shortInstruction("Seven times, 1.5 laps. Next.")).toBe("Seven times, 1.5 laps.");
  });
});

describe("buildCard", () => {
  const t = strings.en;
  const base = { total: 5, language: "en" as Language, t, maxActions: 2 };
  it("title, number, instruction, one persistent tag", () => {
    const c = buildCard({ ...base, step: step("a", 1, "approved"), text: text("Tawaf", "Circle the Kaaba. More.", "approved"), index: 1 });
    expect(c.title).toBe("Tawaf");
    expect(c.options.body).toBe("2 / 5\nCircle the Kaaba.");
    expect(c.options).toMatchObject({ tag: "rafiq-step", renotify: false, requireInteraction: true, silent: true, lang: "en", dir: "ltr" });
    expect(c.options.actions.map((a) => a.action)).toEqual(["prev", "next"]);
    expect(c.options.actions.map((a) => a.title)).toEqual([t.previous, t.nextStep]);
  });
  it("marks text that is not approved as pending", () => {
    const c = buildCard({ ...base, step: step("a", 1), text: text("T", "Do it."), index: 0 });
    expect(c.options.body).toBe(`1 / 5 · ${t.review.pending}\nDo it.`);
  });
  it("drops Previous at the start and Next at the end, and obeys maxActions", () => {
    expect(buildCard({ ...base, step: step("a", 1), text: text("T", "x."), index: 0 }).options.actions.map((a) => a.action)).toEqual(["next"]);
    expect(buildCard({ ...base, step: step("a", 1), text: text("T", "x."), index: 4 }).options.actions.map((a) => a.action)).toEqual(["prev"]);
    expect(buildCard({ ...base, maxActions: 1, step: step("a", 1), text: text("T", "x."), index: 2 }).options.actions).toHaveLength(1);
    expect(buildCard({ ...base, maxActions: 0, step: step("a", 1), text: text("T", "x."), index: 2 }).options.actions).toEqual([]);
  });
  it("uses the language's direction and UI strings", () => {
    const ar = buildCard({ ...base, language: "ar", t: strings.ar, step: step("a", 1), text: text("الطواف", "طف سبعًا."), index: 1 });
    expect(ar.options).toMatchObject({ lang: "ar", dir: "rtl" });
    expect(ar.options.body).toContain(strings.ar.review.pending);
    expect(ar.options.actions[0].title).toBe(strings.ar.previous);
    const ur = buildCard({ ...base, language: "ur", t: strings.ur, step: step("a", 1), text: text("طواف", "سات چکر۔"), index: 1 });
    expect(ur.options).toMatchObject({ lang: "ur", dir: "rtl" });
  });
});

it("isCardMessage accepts only the worker's messages", () => {
  expect(isCardMessage({ type: "rafiq-step-action", action: "next" })).toBe(true);
  expect(isCardMessage({ type: "rafiq-step-action", action: "open" })).toBe(true);
  expect(isCardMessage({ type: "other", action: "next" })).toBe(false);
  expect(isCardMessage({ type: "rafiq-step-action", action: "evil" })).toBe(false);
  expect(isCardMessage(null)).toBe(false);
});

// --- Sync with the Guide, with a mocked Notification and service worker ---
const journey: Journey = { id: "t", type: "umrah", version: "0", stages: [{ id: "s", order: 1, steps: [step("a", 1), step("b", 2), step("c", 3)] }] };
const texts: StepTexts = { a: text("One", "First. x"), b: text("Two", "Second. x"), c: text("Three", "Third. x") };

let shown: { title: string; options: Record<string, unknown> }[];
let closed: number;
let swListeners: ((e: MessageEvent) => void)[];
let permission: NotificationPermission;
let requestPermission: ReturnType<typeof vi.fn>;

beforeEach(() => {
  shown = [];
  closed = 0;
  swListeners = [];
  permission = "default";
  requestPermission = vi.fn(async () => {
    permission = "granted";
    return "granted" as NotificationPermission;
  });
  const registration = {
    showNotification: vi.fn(async (title: string, options: Record<string, unknown>) => void shown.push({ title, options })),
    getNotifications: vi.fn(async () => [{ close: () => void closed++ }]),
  };
  vi.stubGlobal("Notification", Object.assign(function () {}, { maxActions: 2, requestPermission }));
  Object.defineProperty(Notification, "permission", { get: () => permission, configurable: true });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: async () => registration,
      ready: Promise.resolve(registration),
      addEventListener: (_: string, l: (e: MessageEvent) => void) => void swListeners.push(l),
      removeEventListener: (_: string, l: (e: MessageEvent) => void) => void (swListeners = swListeners.filter((x) => x !== l)),
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error test cleanup
  delete navigator.serviceWorker;
});

function Host({ language = "en", completed = [] as string[], initial = false }: { language?: Language; completed?: string[]; initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <I18nProvider language={language}>
      <Guide journey={journey} texts={texts} completed={completed} onStepDone={async () => undefined} saveFailed={false} lockCard={on} onLockCardChange={setOn} />
    </I18nProvider>
  );
}
const lockSwitch = () => screen.getByRole("switch", { name: /Lock-screen card|بطاقة شاشة القفل/ });

describe("Lock-screen card in the Guide", () => {
  it("is off by default and asks for permission only when turned on", async () => {
    render(<Host />);
    expect(lockSwitch()).toHaveAttribute("aria-checked", "false");
    expect(requestPermission).not.toHaveBeenCalled();
    expect(shown).toEqual([]);
    await userEvent.click(lockSwitch());
    expect(requestPermission).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(shown).toHaveLength(1));
    expect(shown[0].title).toBe("One");
    expect(lockSwitch()).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("rafiq.lockCard")).toBe("1");
  });

  it("follows the step (buttons and notification taps) and the language", async () => {
    const { rerender } = render(<Host initial />);
    await waitFor(() => expect(shown.at(-1)?.title).toBe("One"));
    await userEvent.click(screen.getByRole("button", { name: "2. Two" }));
    await waitFor(() => expect(shown.at(-1)?.title).toBe("Two"));
    expect(shown.at(-1)?.options.body).toMatch(/^2 \/ 3/);

    act(() => swListeners.forEach((l) => l({ data: { type: "rafiq-step-action", action: "next" } } as MessageEvent)));
    await waitFor(() => expect(shown.at(-1)?.title).toBe("Three"));
    act(() => swListeners.forEach((l) => l({ data: { type: "rafiq-step-action", action: "prev" } } as MessageEvent)));
    await waitFor(() => expect(shown.at(-1)?.title).toBe("Two"));
    const count = shown.length;
    act(() => swListeners.forEach((l) => l({ data: { type: "nope", action: "next" } } as MessageEvent)));
    expect(shown.length).toBe(count);

    rerender(<Host initial language="ar" />);
    await waitFor(() => expect(shown.at(-1)?.options).toMatchObject({ lang: "ar", dir: "rtl" }));
  });

  it("is cleared when turned off, when every step is done, and when the Guide closes", async () => {
    const view = render(<Host initial />);
    await waitFor(() => expect(shown).toHaveLength(1));
    await userEvent.click(lockSwitch());
    await waitFor(() => expect(closed).toBeGreaterThan(0));
    expect(localStorage.getItem("rafiq.lockCard")).toBeNull();

    view.unmount();
    closed = 0;
    const finished = render(<Host initial completed={["a", "b", "c"]} />);
    await waitFor(() => expect(closed).toBeGreaterThan(0));
    expect(shown).toHaveLength(1);

    finished.unmount();
    closed = 0;
    const open = render(<Host initial />);
    await waitFor(() => expect(shown).toHaveLength(2));
    closed = 0;
    open.unmount();
    await waitFor(() => expect(closed).toBeGreaterThan(0));
  });

  it("says so when notifications are unsupported", async () => {
    vi.stubGlobal("Notification", undefined);
    render(<Host />);
    await userEvent.click(lockSwitch());
    expect(screen.getByRole("alert")).toHaveTextContent("cannot show notifications");
    expect(lockSwitch()).toHaveAttribute("aria-checked", "false");
  });

  it("says so when permission is denied, and shows nothing", async () => {
    requestPermission.mockImplementation(async () => {
      permission = "denied";
      return "denied" as NotificationPermission;
    });
    render(<Host />);
    await userEvent.click(lockSwitch());
    expect(screen.getByRole("alert")).toHaveTextContent("Notifications are blocked");
    expect(lockSwitch()).toHaveAttribute("aria-checked", "false");
    expect(shown).toEqual([]);
    // Asked again on the next tap (the browser answers without a prompt), same message.
    await userEvent.click(lockSwitch());
    expect(requestPermission).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Notifications are blocked");
  });

  it("reports a failure to show, with a way to turn it off", async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    vi.mocked(reg!.showNotification).mockRejectedValue(new Error("boom"));
    render(<Host />);
    await userEvent.click(lockSwitch());
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("could not be shown"));
    await userEvent.click(screen.getByRole("button", { name: "Turn off the lock-screen card" }));
    expect(lockSwitch()).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("is remembered only while permission is still granted", () => {
    localStorage.setItem("rafiq.lockCard", "1");
    permission = "granted";
    expect(readCardPreference()).toBe(true);
    permission = "denied";
    expect(readCardPreference()).toBe(false);
    permission = "default";
    expect(readCardPreference()).toBe(false);
  });
});

describe("Keep screen on", () => {
  const sentinel = () => ({ release: vi.fn(async () => undefined), addEventListener: vi.fn() });
  const wakeSwitch = () => screen.getByRole("switch", { name: "Keep screen on while reading" });

  it("is off by default, requests a lock when turned on, re-acquires on return, releases when off", async () => {
    const locks: ReturnType<typeof sentinel>[] = [];
    const request = vi.fn(async () => {
      const s = sentinel();
      locks.push(s);
      return s;
    });
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    render(<Host />);
    expect(request).not.toHaveBeenCalled();
    await userEvent.click(wakeSwitch());
    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
    expect(wakeSwitch()).toHaveAttribute("aria-checked", "true");

    // The browser drops the lock when the page hides; coming back asks again.
    const released = locks[0].addEventListener.mock.calls.find(([name]) => name === "release")?.[1] as () => void;
    released();
    fireEvent(document, new Event("visibilitychange"));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));

    await userEvent.click(wakeSwitch());
    await waitFor(() => expect(locks[1].release).toHaveBeenCalled());
    // @ts-expect-error test cleanup
    delete navigator.wakeLock;
  });

  it("says so when unsupported or refused", async () => {
    render(<Host />);
    await userEvent.click(wakeSwitch());
    expect(screen.getByRole("alert")).toHaveTextContent("cannot keep the screen on");
    await userEvent.click(screen.getByRole("button", { name: "Turn off keeping the screen on" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => Promise.reject(new Error("no")) } });
    await userEvent.click(wakeSwitch());
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("could not be kept on"));
    // @ts-expect-error test cleanup
    delete navigator.wakeLock;
  });
});
