import { useEffect, useRef, useState } from "react";
import type { Step, StepText } from "../data/types";
import { buildCard, cardSupport, clearCard, isCardMessage, requestCardPermission, showCard, writeCardPreference } from "../data/lockcard";
import { useLanguage, useT } from "../i18n";
import { Icon } from "./Icon";

// T051 (FR-026, FR-027): the lock-screen card toggle (a notification kept in step with the Guide) and
// the optional "keep screen on" switch.

type CardError = "unsupported" | "denied" | "failed";

/** One switch row, styled like Live mode's. */
function Switch({ id, title, hint, on, onClick, children }: { id: string; title: string; hint: string; on: boolean; onClick: () => void; children?: React.ReactNode }) {
  return (
    <section className={on ? "setting-card on" : "setting-card"} aria-labelledby={`${id}-title`}>
      <div className="live-head">
        <span className="grow">
          <strong id={`${id}-title`}>{title}</strong>
          <small id={`${id}-hint`}>{hint}</small>
        </span>
        <button type="button" className="live-switch" role="switch" id={id} aria-checked={on} aria-labelledby={`${id}-title`} aria-describedby={`${id}-hint`} onClick={onClick}>
          <span className="live-knob">{on && <Icon name="check" size={14} />}</span>
        </button>
      </div>
      {children}
    </section>
  );
}

export function LockCard({
  on,
  onChange,
  step,
  text,
  index,
  total,
  finished,
  onMove,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  step: Step;
  text: StepText | undefined;
  index: number;
  total: number;
  /** Every step is done: the card goes away. */
  finished: boolean;
  /** The pilgrim tapped Previous (-1) or Next (+1) on the notification. */
  onMove: (delta: -1 | 1) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const [error, setError] = useState<CardError | null>(null);
  // Bumped when the service worker reports a tap, so a notification the tap closed is shown again.
  const [tapped, setTapped] = useState(0);
  const moveRef = useRef(onMove);
  useEffect(() => {
    moveRef.current = onMove;
  });

  // Taps on the notification arrive here through the service worker (public/sw-extra.js).
  useEffect(() => {
    const sw = typeof navigator === "undefined" ? undefined : navigator.serviceWorker;
    if (!on || !sw) return;
    const listener = (event: MessageEvent) => {
      if (!isCardMessage(event.data)) return;
      if (event.data.action === "prev") moveRef.current(-1);
      if (event.data.action === "next") moveRef.current(1);
      setTapped((n) => n + 1);
    };
    sw.addEventListener("message", listener);
    return () => sw.removeEventListener("message", listener);
  }, [on]);

  // Keep the notification equal to the open step; remove it when off, finished or leaving the Guide.
  const wanted = on && !finished && !!text;
  useEffect(() => {
    if (!wanted || !text) return;
    let cancelled = false;
    const maxActions = typeof Notification === "undefined" ? 0 : ((Notification as unknown as { maxActions?: number }).maxActions ?? 0);
    showCard(buildCard({ step, text, index, total, language, t, maxActions })).then(
      () => !cancelled && setError(null),
      () => !cancelled && setError("failed"),
    );
    return () => {
      cancelled = true;
    };
  }, [wanted, step, text, index, total, language, t, tapped]);
  useEffect(() => {
    if (!wanted) void clearCard();
  }, [wanted]);
  useEffect(() => () => void clearCard(), []);

  const toggle = async () => {
    if (on) {
      writeCardPreference(false);
      setError(null);
      onChange(false);
      return;
    }
    // Permission is asked here, from the tap, and only here.
    const support = cardSupport();
    if (support !== "supported") return setError(support);
    try {
      const result = await requestCardPermission();
      if (result !== "granted") return setError(result);
    } catch {
      return setError("failed");
    }
    setError(null);
    writeCardPreference(true);
    onChange(true);
  };

  return (
    <Switch id="lock-card" title={t.lockCard.title} hint={on ? t.lockCard.privacy : t.lockCard.hint} on={on} onClick={toggle}>
      {error && (
        <div className="live-body">
          <p className="live-message live-error" role="alert">{t.lockCard.errors[error]}</p>
          {on && <button type="button" className="live-off" onClick={() => { void toggle(); document.getElementById("lock-card")?.focus(); }}>{t.lockCard.turnOff}</button>}
        </div>
      )}
    </Switch>
  );
}

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockApi = { request: (type: "screen") => Promise<WakeLockSentinelLike> };

/** Holds a screen wake lock while `on`; re-acquires it when the page becomes visible again. */
export function useWakeLock(on: boolean): "idle" | "held" | "unsupported" | "failed" {
  const [state, setState] = useState<"idle" | "held" | "unsupported" | "failed">("idle");
  useEffect(() => {
    if (!on) return;
    const api = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
    if (!api) {
      setState("unsupported");
      return;
    }
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (sentinel || document.visibilityState === "hidden") return;
      try {
        const lock = await api.request("screen");
        if (cancelled) return void lock.release().catch(() => undefined);
        sentinel = lock;
        (lock as unknown as EventTarget).addEventListener?.("release", () => {
          if (sentinel === lock) sentinel = null;
        });
        setState("held");
      } catch {
        if (!cancelled) setState("failed");
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    void acquire();
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
      setState("idle");
    };
  }, [on]);
  return on ? state : "idle";
}

export function WakeLockSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const t = useT();
  const state = useWakeLock(on);
  const problem = state === "unsupported" ? t.wakeLock.unsupported : state === "failed" ? t.wakeLock.failed : null;
  return (
    <Switch id="wake-lock" title={t.wakeLock.title} hint={t.wakeLock.hint} on={on && !problem} onClick={() => onChange(!on)}>
      {problem && (
        <div className="live-body">
          <p className="live-message live-error" role="alert">{problem}</p>
          <button type="button" className="live-off" onClick={() => onChange(false)}>{t.wakeLock.turnOff}</button>
        </div>
      )}
    </Switch>
  );
}
