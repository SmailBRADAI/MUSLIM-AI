import { displayStatus } from "./types";
import type { Step, StepText } from "./types";
import { isRtl } from "../i18n";
import type { Language, Strings } from "../i18n";

// T051 (FR-025): the lock-screen card is a local notification (a web app cannot draw on the lock
// screen). The text is the step's reviewed content in the current language; no location, no
// personal data, and no religious wording of its own.

export const CARD_TAG = "rafiq-step" as const;
/** Messages from the service worker script (public/sw-extra.js) use this type. */
export const CARD_MESSAGE = "rafiq-step-action";
export const BODY_MAX = 140;

export type CardAction = "prev" | "next";
export type CardMessage = { type: typeof CARD_MESSAGE; action: CardAction | "open" };

export function isCardMessage(data: unknown): data is CardMessage {
  const m = data as Partial<CardMessage> | null;
  return !!m && m.type === CARD_MESSAGE && (m.action === "prev" || m.action === "next" || m.action === "open");
}

/** First sentence of a text, cut at a word boundary to `max` characters with an ellipsis. */
export function shortInstruction(text: string, max = BODY_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  // Sentence ends: Latin and Arabic/Urdu full stops and question marks, when followed by a space.
  const first = clean.match(/^.*?[.!?؟۔](?=\s|$)/)?.[0] ?? clean;
  if (first.length <= max) return first;
  const cut = first.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:،؛.]+$/, "")}…`;
}

export interface CardContent {
  title: string;
  options: {
    body: string;
    tag: string;
    renotify: boolean;
    silent: boolean;
    requireInteraction: boolean;
    lang: Language;
    dir: "rtl" | "ltr";
    icon: string;
    data: { card: typeof CARD_TAG };
    actions: { action: CardAction; title: string }[];
  };
}

export function buildCard(args: {
  step: Step;
  text: StepText;
  index: number;
  total: number;
  language: Language;
  t: Strings;
  maxActions?: number;
  icon?: string;
}): CardContent {
  const { step, text, index, total, language, t } = args;
  const parts = [`${index + 1} / ${total}`];
  // Constitution I: content that is not approved is visibly marked, in the notification as in the app.
  if (displayStatus(step, text) !== "approved") parts.push(t.review.pending);
  const head = parts.join(" · ");
  const actions: CardContent["options"]["actions"] = [];
  if (index > 0) actions.push({ action: "prev", title: t.previous });
  if (index < total - 1) actions.push({ action: "next", title: t.nextStep });
  return {
    title: text.title,
    options: {
      body: `${head}\n${shortInstruction(text.instruction)}`,
      tag: CARD_TAG,
      renotify: false,
      silent: true,
      requireInteraction: true,
      lang: language,
      dir: isRtl(language) ? "rtl" : "ltr",
      icon: args.icon ?? "icon.svg",
      data: { card: CARD_TAG },
      actions: actions.slice(0, Math.max(0, args.maxActions ?? 0)),
    },
  };
}

export type CardSupport = "supported" | "unsupported";

export function cardSupport(): CardSupport {
  if (typeof Notification === "undefined" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
  // A denied permission is not checked here: asking again is harmless (the browser answers "denied"
  // without a prompt) and some browsers report "denied" before the permission has been granted.
  return "supported";
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  // The worker may still be installing on the first visit.
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("no service worker")), 4000)),
  ]);
}

/** Asks for permission (call only from a tap). */
export async function requestCardPermission(): Promise<"granted" | "denied" | "unsupported"> {
  if (cardSupport() === "unsupported") return "unsupported";
  const result = await Notification.requestPermission();
  return result === "granted" ? "granted" : "denied";
}

// Show and clear run one after another, so a clear from a closing Guide can't remove the card that a
// newly opened one has just shown.
let queue: Promise<unknown> = Promise.resolve();
const enqueue = <T,>(job: () => Promise<T>): Promise<T> => {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
};

/** Shows or replaces the card. Rejects if the browser refuses. */
export function showCard(content: CardContent): Promise<void> {
  return enqueue(async () => {
    const reg = await registration();
    await reg.showNotification(content.title, content.options);
  });
}

/** Removes the card if there is one; never rejects. */
export function clearCard(): Promise<void> {
  return enqueue(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const open = (await reg?.getNotifications({ tag: CARD_TAG })) ?? [];
      open.forEach((n) => n.close());
    } catch {
      // Nothing to clear, or the browser can't tell us.
    }
  });
}

const KEY = "rafiq.lockCard";
export function readCardPreference(): boolean {
  try {
    return localStorage.getItem(KEY) === "1" && cardSupport() === "supported" && Notification.permission === "granted";
  } catch {
    return false;
  }
}
export function writeCardPreference(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice lasts for this session only.
  }
}
