import { useEffect, useRef, useState } from "react";
import { DiagramView } from "../components/Illustrations";
import { diagramsOf } from "../data/diagrams";
import { pictureOf, pictureSrc } from "../data/pictures";
import { Icon } from "../components/Icon";
import { LiveMode } from "../components/LiveMode";
import { LockCard, WakeLockSwitch } from "../components/LockCard";
import { PlaceVisual } from "../components/PlaceVisual";
import { supplicationsOf } from "../data/supplications";
import { ReviewBadge } from "../components/ReviewBadge";
import { RulingTag } from "../components/RulingTag";
import { useSwipe } from "../components/useSwipe";
import type { StepTexts } from "../data/content";
import { completion, currentStep, orderedSteps } from "../data/progress";
import { prefersReducedMotion } from "../data/swipe";
import { displayStatus, isPlace } from "../data/types";
import type { Journey, JourneyType, Stage, Step } from "../data/types";
import { isRtl, useLanguage, useT } from "../i18n";
import type { Strings } from "../i18n";

const HINT_KEY = "rafiq.swipeHint";
const hintSeen = () => {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
};
const rememberHint = () => {
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    // Storage blocked: the hint comes back next time, which is harmless.
  }
};
/** Swiping is for touch screens; on a mouse-and-keyboard device the hint would only be noise. */
const hasTouch = () => typeof matchMedia !== "function" || matchMedia("(pointer: coarse)").matches;

const guideLabel = (t: Strings, type: JourneyType) => (type === "umrah" ? t.umrahGuide : t.journeys[type]);

type Day = keyof Strings["days"];
const isDay = (t: Strings, day: number | undefined): day is number => day !== undefined && String(day) in t.days;

/** T032: a Hajj stage's short name for the step list ("9 Dhu al-Hijjah", "Umrah"); null for Umrah stages. */
function stageShortName(t: Strings, stage: Stage) {
  if (isDay(t, stage.day)) return t.days[String(stage.day) as Day].date;
  return stage.kind ? t.stages[stage.kind] : null;
}

/** The open step's stage, in full ("9 Dhu al-Hijjah · Day of Arafah"); null for Umrah stages. */
function stageFullName(t: Strings, stage: Stage | undefined) {
  if (!stage) return null;
  if (isDay(t, stage.day)) {
    const day = t.days[String(stage.day) as Day];
    return `${day.date} · ${day.name}`;
  }
  return stageShortName(t, stage);
}

/** Stages in order, each with its steps; used for the day view of Hajj journeys. */
function stageGroups(journey: Journey) {
  return [...journey.stages]
    .sort((a, b) => a.order - b.order)
    .map((stage) => ({ stage, steps: [...stage.steps].sort((a, b) => a.order - b.order) }));
}

/** T020: one step at a time, driven by the journey content. */
export function Guide({
  journey,
  texts,
  completed,
  onStepDone,
  saveFailed,
  live = false,
  onLiveChange,
  lockCard = false,
  onLockCardChange,
}: {
  journey: Journey;
  texts: StepTexts;
  completed: readonly string[];
  /** Saves on the device; the guide moves on once it resolves. */
  onStepDone: (stepId: string, done: boolean) => Promise<void>;
  saveFailed: boolean;
  /** T048: Live mode, on for this session only; the card is shown when onLiveChange is given. */
  live?: boolean;
  onLiveChange?: (on: boolean) => void;
  /** T051: the lock-screen card, remembered on the device; the toggle is shown when onLockCardChange is given. */
  lockCard?: boolean;
  onLockCardChange?: (on: boolean) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const rtl = isRtl(language);
  const steps = orderedSteps(journey);
  const [index, setIndex] = useState(() => {
    const current = currentStep(journey, completed);
    return current ? steps.indexOf(current) : steps.length - 1;
  });
  const [details, setDetails] = useState(false);
  // One action at a time: a double tap must not complete the step that slides in under the finger.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  // T051: swipe changes the step shown (never marks it done) and is announced without moving focus.
  const [slide, setSlide] = useState<"next" | "previous" | null>(null);
  const [swiped, setSwiped] = useState("");
  const [hint, setHint] = useState(() => !hintSeen() && hasTouch());
  const [keepAwake, setKeepAwake] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const step = steps[index];
  const text = texts[step.id];
  const supplications = supplicationsOf(step, language);

  // After an action changes the step or removes the focused button, put focus on the step title
  // so screen readers announce where the pilgrim is.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    headingRef.current?.focus();
  });
  const done = completed.includes(step.id);
  const next = steps[index + 1];
  const percent = Math.round(completion(journey, completed) * 100);
  const otherSchools = text && step.rulingNote ? String(text[step.rulingNote] ?? "") : "";
  const titleOf = (id: string) => texts[id]?.title ?? id;
  // T032: Hajj journeys are shown by day (stages carry a day or a named part); the Umrah keeps one list.
  const groups = stageGroups(journey);
  const byDay = groups.some(({ stage }) => stageShortName(t, stage));
  const stageNow = byDay ? stageFullName(t, groups.find((g) => g.steps.includes(step))?.stage) : null;

  const run = async (action: () => Promise<void>) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await action();
    } finally {
      savingRef.current = false;
      setSaving(false);
      moved.current = true;
    }
  };
  const goTo = (i: number) => {
    setIndex(i);
    setDetails(false);
    setSwiped("");
    moved.current = true;
  };
  const dismissHint = () => {
    setHint(false);
    rememberHint();
  };
  const swipe = useSwipe((direction) => {
    const target = direction === "next" ? index + 1 : index - 1;
    if (savingRef.current || target < 0 || target >= steps.length) return;
    setIndex(target);
    setDetails(false);
    // Entering from the side the step sits on in reading order; no slide for reduced motion.
    setSlide(prefersReducedMotion() ? null : direction);
    const title = texts[steps[target].id]?.title ?? steps[target].id;
    setSwiped(t.swipe.announce.replace("{n}", String(target + 1)).replace("{total}", String(steps.length)).replace("{title}", title));
    if (hint) dismissHint();
  }, rtl);
  const markDone = () =>
    run(async () => {
      if (!done) await onStepDone(step.id, true);
      if (next) goTo(index + 1);
    });
  const undo = () => run(() => onStepDone(step.id, false));

  function stepButton(s: Step, i: number) {
    const isDone = completed.includes(s.id);
    return (
      <li key={s.id} className={[isDone && "done", i === index && "current"].filter(Boolean).join(" ") || undefined}>
        <button
          onClick={() => goTo(i)}
          disabled={saving}
          aria-current={i === index ? "step" : undefined}
          aria-label={`${i + 1}. ${titleOf(s.id)}${isDone ? ` (${t.stepDone})` : ""}`}
        >
          <span className="step-dot">{isDone ? <Icon name="check" size={13} /> : i + 1}</span>
        </button>
      </li>
    );
  }

  // Content is validated in CI; a missing translation must still never crash the guide.
  if (!text) return <GuideNotReady />;

  return (
    <main className="page guide-page">
      <div className="guide-heading">
        <div>
          <span className="eyebrow">{guideLabel(t, journey.type)}</span>
          {stageNow && <p className="stage-now" id="stage-now">{stageNow}</p>}
          {/* Focus moves to the title after each action; the day is read with it, since it may have changed. */}
          <h1 ref={headingRef} tabIndex={-1} aria-describedby={stageNow ? "stage-now" : undefined}>{text.title}</h1>
        </div>
        <span className="step-pill">{index + 1} / {steps.length}</span>
      </div>
      {/* The switches live in one settings panel, closed by default, instead of on every step. */}
      <details className="guide-settings">
        <summary><Icon name="settings" size={18} />{t.settings}</summary>
        {/* T048: suggests the step for where the pilgrim seems to be; the location is watched only while
            this is on and the Guide is open, and never leaves the device. */}
        {onLiveChange && (
          <LiveMode
            on={live}
            onChange={onLiveChange}
            journey={journey}
            texts={texts}
            completed={completed}
            openStepId={step.id}
            onGoToStep={(id) => goTo(steps.findIndex((s) => s.id === id))}
            busy={saving}
          />
        )}
        {onLockCardChange && (
          <LockCard
            on={lockCard}
            onChange={onLockCardChange}
            step={step}
            text={text}
            index={index}
            total={steps.length}
            finished={percent === 100}
            onMove={(delta) => {
              const target = index + delta;
              if (target >= 0 && target < steps.length) goTo(target);
            }}
          />
        )}
        <WakeLockSwitch on={keepAwake} onChange={setKeepAwake} />
      </details>
      {/* The timeline is tucked away: closed by default, still the way to open any step (T023). */}
      <details className="all-steps">
        <summary><span className="grow">{t.stepList}</span><strong>{percent}%</strong></summary>
        {/* T023: any step can be opened from here, and steps may be done in any order. */}
        {byDay ? (
          // T032: the same step buttons, grouped under each day or part of the Hajj.
          <ol className="stage-groups" aria-label={t.stepList}>
            {groups.map(({ stage, steps: stageSteps }) => (
              <li key={stage.id} className={stageSteps.includes(step) ? "stage-group current" : "stage-group"}>
                <span className="stage-name" id={`stage-${stage.id}`}>{stageShortName(t, stage)}</span>
                <ol className="steps" aria-labelledby={`stage-${stage.id}`}>
                  {stageSteps.map((s) => stepButton(s, steps.indexOf(s)))}
                </ol>
              </li>
            ))}
          </ol>
        ) : (
          <ol className="steps" aria-label={t.stepList}>
            {steps.map((s, i) => stepButton(s, i))}
          </ol>
        )}
      </details>

      {/* T047: where this step is performed, above the step content. Content is validated in CI, but an
          unknown place must not crash the guide. */}
      {hint && (
        <div className="swipe-hint">
          <Icon name="sparkle" size={18} />
          <span className="grow">{t.swipe.hint}</span>
          <button type="button" className="live-off" onClick={dismissHint}>{t.swipe.dismiss}</button>
        </div>
      )}
      <div
        className={slide ? "swipe-area slide" : "swipe-area"}
        data-slide={slide ?? undefined}
        style={slide ? ({ "--slide-from": `${(slide === "next") === rtl ? -28 : 28}px` } as React.CSSProperties) : undefined}
        onAnimationEnd={() => setSlide(null)}
        {...swipe}
      >
      {isPlace(step.place) && <PlaceVisual place={step.place} />}
      {/* T053: the step's picture, where there is one; decorative to the ritual text, described by a UI string. */}
      {pictureOf(step.id) && (
        <figure className="step-picture">
          <img src={pictureSrc(pictureOf(step.id)!)} alt={t.stepPictures[pictureOf(step.id)!]} width={960} height={644} decoding="async" />
        </figure>
      )}
      <section className="instruction-card">
        <div className="instruction-meta">
          <span className="ritual-icon"><Icon name="compass" /></span>
          <RulingTag ruling={step.ruling} views={step.rulingViews} />
          <ReviewBadge status={displayStatus(step, text)} />
        </div>
        <h2>{t.instructionTitle}</h2>
        <p>{text.instruction}</p>
        {/* T049: the step's illustrations in order; the first is captioned by diagramLabel, the others by their own item. */}
        {diagramsOf(step).map((diagram, i) => {
          const caption = i === 0 ? text.diagramLabel : text.diagramItems?.[`${diagram}.caption`];
          return caption ? <DiagramView key={diagram} diagram={diagram} caption={caption} items={text.diagramItems} /> : null;
        })}
      </section>
      </div>
      <p className="visually-hidden" role="status">{swiped}</p>

      {/* T054, FR-030: the recommended supplications, highlighted. A general remembrance is labelled as such. */}
      {supplications.length > 0 && (
        <section className="supplications-panel" aria-labelledby="supplications-title">
          <h2 id="supplications-title"><Icon name="sparkle" size={18} />{t.supplications.title}</h2>
          <ul>
            {supplications.map(({ supplication, text: s }) => (
              <li key={supplication.id} className={`supplication ${supplication.scope}`}>
                <div className="supplication-head">
                  <strong>{s.title}</strong>
                  <span className={`scope-tag ${supplication.scope}`}>
                    {supplication.scope === "specific" ? t.supplications.specific : t.supplications.general}
                  </span>
                  <ReviewBadge status={displayStatus(supplication, s)} />
                </div>
                <p className="supplication-arabic" lang="ar" dir="rtl">{supplication.arabic}</p>
                {s.transliteration && <p className="supplication-translit" lang="en" dir="ltr"><span>{t.supplications.transliteration}: </span>{s.transliteration}</p>}
                {s.meaning && <p className="supplication-meaning"><span>{t.supplications.meaning}: </span>{s.meaning}</p>}
                <p className="supplication-when"><span>{t.supplications.when}: </span>{s.when}</p>
                <p className="supplication-source">
                  <span>{t.supplications.source}: </span>
                  <bdi lang="ar" dir="rtl">{supplication.meta.source.join("؛ ")}</bdi>
                  {" · "}{t.supplications.grading[supplication.grading]}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="action-list">
        {/* TODO(T036): audio, shown only when the step has it. */}
        <button className="action-row" onClick={() => setDetails(!details)} aria-expanded={details} aria-controls="step-details">
          <span className="action-icon sage"><Icon name="book" /></span>
          <span className="grow"><strong>{t.details}</strong></span>
          <span className={details ? "rotate" : ""}><Icon name="chevron" size={18} /></span>
        </button>
        {details && (
          <div className="detail-note" id="step-details">
            {text.details.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <h3>{t.commonMistakes}</h3>
            <p>{text.mistakes}</p>
            {otherSchools && (
              <>
                <h3>{t.otherSchools}</h3>
                <p>{otherSchools}</p>
              </>
            )}
            <h3>{t.sources}</h3>
            <ul>{step.meta.source.map((source) => <li key={source} lang="ar" dir="rtl">{source}</li>)}</ul>
          </div>
        )}
      </div>

      {next && <div className="next-note"><Icon name="sparkle" size={18} /><span>{t.nextStep}: {titleOf(next.id)}</span></div>}
      <button className={done ? "complete-button completed" : "complete-button"} onClick={markDone} disabled={saving || (done && !next)}>
        <Icon name="check" />
        {done ? (next ? t.nextStep : t.stepDone) : t.complete}
        <Icon name="arrow" />
      </button>
      {done && <button className="previous-button" onClick={undo} disabled={saving}>{t.undo}</button>}
      <button className="previous-button" onClick={() => goTo(index - 1)} disabled={saving || index === 0}>{t.previous}</button>
      {saveFailed ? (
        <p className="save-note save-failed" role="alert"><Icon name="shield" size={16} />{t.saveFailed}</p>
      ) : (
        <p className="save-note"><Icon name="shield" size={16} />{t.reassurance}</p>
      )}
    </main>
  );
}

/** Shown when a journey has no content in this language, rather than another journey's steps. */
export function GuideNotReady() {
  const t = useT();
  return (
    <main className="page guide-page">
      <h1>{t.guide}</h1>
      <p className="save-note" role="status"><Icon name="shield" size={16} />{t.guideNotReady}</p>
    </main>
  );
}
