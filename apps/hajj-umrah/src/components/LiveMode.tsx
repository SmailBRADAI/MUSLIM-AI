import { useEffect, useRef, useState } from "react";
import type { StepTexts } from "../data/content";
import { detectPlace } from "../data/geofence";
import type { Fix } from "../data/geofence";
import { suggestStep } from "../data/live";
import { GEO_ATTRIBUTION, GEO_REGIONS } from "../data/places-geo";
import type { GeoRegion } from "../data/places-geo";
import type { Journey } from "../data/types";
import { useT } from "../i18n";
import type { Strings } from "../i18n";
import { Icon } from "./Icon";
import { PlaceVisual } from "./PlaceVisual";

// T048 (FR-020–FR-023): Live mode. Opt-in; the location is watched only while it is on, the Guide is
// open and the page is visible, and it is kept in memory only: never stored, never sent.

type GeoError = "denied" | "unavailable" | "timeout";
export type GeoState = { status: "waiting" } | { status: "unsupported" } | { status: "error"; error: GeoError } | { status: "fix"; fix: Fix };

const WATCH_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 };
/** A recent position is kept through a passing timeout or signal loss rather than replaced by an error. */
const KEEP_FIX_MS = 60_000;
/** A change between two located results must hold this long before it is shown and announced. */
export const SETTLE_MS = 3_000;

/** Watches the position while `enabled` and the page is visible; null when not enabled. */
export function useGeolocation(enabled: boolean): GeoState | null {
  const [state, setState] = useState<GeoState>({ status: "waiting" });
  useEffect(() => {
    if (!enabled) return;
    const geo = typeof navigator === "undefined" ? undefined : navigator.geolocation;
    if (!geo) {
      setState({ status: "unsupported" });
      return;
    }
    setState({ status: "waiting" });
    let watchId: number | null = null;
    let denied = false;
    let lastFixAt = -Infinity;
    const stop = () => {
      if (watchId !== null) geo.clearWatch(watchId);
      watchId = null;
    };
    const start = () => {
      if (watchId !== null || denied || document.visibilityState === "hidden") return;
      watchId = geo.watchPosition(
        ({ coords }) => {
          lastFixAt = Date.now();
          setState({ status: "fix", fix: { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy } });
        },
        (error) => {
          // 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT. The watch keeps trying after 2 and 3.
          if (error.code === 1) {
            denied = true;
            stop();
            setState({ status: "error", error: "denied" });
          } else if (Date.now() - lastFixAt > KEEP_FIX_MS) {
            setState({ status: "error", error: error.code === 3 ? "timeout" : "unavailable" });
          }
        },
        WATCH_OPTIONS,
      );
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
      // Forget the last position, so turning Live mode on again never shows a stale place.
      setState({ status: "waiting" });
    };
  }, [enabled]);
  return enabled ? state : null;
}

/** One key per thing the card can say; the card and the announcement change only when it changes. */
function keyOf(state: GeoState): string {
  if (state.status === "waiting" || state.status === "unsupported") return state.status;
  if (state.status === "error") return `error:${state.error}`;
  const detection = detectPlace(state.fix);
  return detection.status === "near" ? `near:${detection.region.id}` : detection.status;
}

const located = (key: string) => key === "uncertain" || key === "outside" || key.startsWith("near:");

/** Moves between two located results only once the new one has held for `ms`, so GPS jitter at an edge does not flicker. */
function useSettled(key: string, ms: number) {
  const [settled, setSettled] = useState(key);
  const wait = key !== settled && located(key) && located(settled);
  useEffect(() => {
    if (key === settled) return;
    if (!wait) return setSettled(key);
    const id = setTimeout(() => setSettled(key), ms);
    return () => clearTimeout(id);
  }, [key, settled, wait, ms]);
  return wait ? settled : key;
}

const regionById = (id: string) => GEO_REGIONS.find((r) => r.id === id);

/** "You seem to be in the Mataf", "You seem to be near the miqat of Yalamlam". */
function regionSentence(t: Strings, region: GeoRegion) {
  const sentence = t.live.regions[region.kind];
  return region.miqat ? sentence.replace("{miqat}", t.live.miqats[region.miqat]) : sentence;
}

export function LiveMode({
  on,
  onChange,
  journey,
  texts,
  completed,
  openStepId,
  onGoToStep,
  busy = false,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  journey: Journey;
  texts: StepTexts;
  completed: readonly string[];
  /** The step open in the Guide. */
  openStepId: string;
  onGoToStep: (stepId: string) => void;
  busy?: boolean;
}) {
  const t = useT();
  const geo = useGeolocation(on);
  const shown = useSettled(geo ? keyOf(geo) : "off", SETTLE_MS);
  const region = shown.startsWith("near:") ? regionById(shown.slice(5)) : undefined;
  const suggestion = region ? suggestStep(journey, completed, region) : null;
  const suggestedTitle = suggestion ? (texts[suggestion.id]?.title ?? suggestion.id) : "";
  const sentence = region ? regionSentence(t, region) : "";
  const error = shown.startsWith("error:") ? (shown.slice(6) as GeoError) : null;
  const switchRef = useRef<HTMLButtonElement>(null);

  let message = "";
  if (shown === "waiting") message = t.live.finding;
  else if (shown === "uncertain") message = t.live.uncertain;
  else if (shown === "outside") message = t.live.outside;
  else if (shown === "unsupported") message = t.live.errors.unsupported;
  else if (error) message = t.live.errors[error];

  // Read out once the place has settled, never on every GPS update; focus stays where it is.
  const announcement = !on
    ? ""
    : region
      ? [sentence, suggestion ? `${t.live.suggested}: ${suggestedTitle}` : t.live.noStep].join(". ")
      : message;

  const turnOff = () => {
    onChange(false);
    // The "Turn off" button disappears with the message; keep focus on the switch.
    switchRef.current?.focus();
  };

  return (
    <section className={on ? "live-card on" : "live-card"} aria-labelledby="live-title">
      <div className="live-head">
        <span className="action-icon"><Icon name="compass" /></span>
        <span className="grow">
          <strong id="live-title">{t.live.title}</strong>
          {!on && <small>{t.live.hint}</small>}
          <small id="live-privacy">{t.live.privacy}</small>
        </span>
        <button
          ref={switchRef}
          type="button"
          className="live-switch"
          role="switch"
          aria-checked={on}
          aria-labelledby="live-title"
          aria-describedby="live-privacy"
          onClick={() => onChange(!on)}
        >
          <span className="live-knob">{on && <Icon name="check" size={14} />}</span>
        </button>
      </div>

      {on && (
        <div className="live-body">
          {region ? (
            <>
              <PlaceVisual place={region.place} caption={sentence} />
              {region.boundary && <p className="live-note"><Icon name="shield" size={16} />{t.live.checkSigns}</p>}
              {suggestion ? (
                <div className="live-suggestion">
                  <small>{t.live.suggested}</small>
                  <strong>{suggestedTitle}</strong>
                  {suggestion.id === openStepId ? (
                    <p className="live-open">{t.live.openNow}</p>
                  ) : (
                    <button type="button" className="pack-button live-go" onClick={() => onGoToStep(suggestion.id)} disabled={busy}>
                      {t.live.goToStep}
                      <Icon name="arrow" size={18} />
                    </button>
                  )}
                  <small>{t.live.onlySuggests}</small>
                </div>
              ) : (
                <p className="live-message">{t.live.noStep}</p>
              )}
            </>
          ) : (
            <p className={error || shown === "unsupported" ? "live-message live-error" : "live-message"}>{message}</p>
          )}
          {(error || shown === "unsupported") && (
            <button type="button" className="live-off" onClick={turnOff}>{t.live.turnOff}</button>
          )}
          {/* The attribution is Latin text: isolate it so "©" stays in front in Arabic and Urdu. */}
          <small className="live-attribution">
            {t.live.attribution.split("{attribution}")[0]}
            <bdi dir="ltr">{GEO_ATTRIBUTION}</bdi>
            {t.live.attribution.split("{attribution}")[1]}
          </small>
        </div>
      )}
      <p className="visually-hidden" role="status">{announcement}</p>
    </section>
  );
}
