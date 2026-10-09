import { useEffect, useRef, useState } from "react";
import { SaiDiagram, TawafDiagram } from "../components/Diagrams";
import { Icon } from "../components/Icon";
import { ReviewBadge } from "../components/ReviewBadge";
import { RulingTag } from "../components/RulingTag";
import type { StepTexts } from "../data/content";
import { completion, currentStep, orderedSteps } from "../data/progress";
import { displayStatus } from "../data/types";
import type { Journey, JourneyType, Stage, Step } from "../data/types";
import { useT } from "../i18n";
import type { Strings } from "../i18n";

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
}: {
  journey: Journey;
  texts: StepTexts;
  completed: readonly string[];
  /** Saves on the device; the guide moves on once it resolves. */
  onStepDone: (stepId: string, done: boolean) => Promise<void>;
  saveFailed: boolean;
}) {
  const t = useT();
  const steps = orderedSteps(journey);
  const [index, setIndex] = useState(() => {
    const current = currentStep(journey, completed);
    return current ? steps.indexOf(current) : steps.length - 1;
  });
  const [details, setDetails] = useState(false);
  // One action at a time: a double tap must not complete the step that slides in under the finger.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const step = steps[index];
  const text = texts[step.id];

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
    moved.current = true;
  };
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
          {stageNow && <p className="stage-now">{stageNow}</p>}
          <h1 ref={headingRef} tabIndex={-1}>{text.title}</h1>
        </div>
        <span className="step-pill">{index + 1} / {steps.length}</span>
      </div>
      <section className="progress-panel">
        <div className="progress-label"><span>{t.progress}</span><strong>{percent}%</strong></div>
        <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
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
      </section>

      <section className="instruction-card">
        <div className="instruction-meta">
          <span className="ritual-icon"><Icon name="compass" /></span>
          <RulingTag ruling={step.ruling} views={step.rulingViews} />
          <ReviewBadge status={displayStatus(step, text)} />
        </div>
        <h2>{t.instructionTitle}</h2>
        <p>{text.instruction}</p>
        {step.diagram === "tawaf" && text.diagramLabel && <TawafDiagram label={text.diagramLabel} />}
        {step.diagram === "sai" && text.diagramLabel && <SaiDiagram label={text.diagramLabel} />}
      </section>

      <div className="action-list">
        {/* TODO(T035, T036): related supplications and audio, shown only when the step has them. */}
        <button className="action-row" onClick={() => setDetails(!details)} aria-expanded={details} aria-controls="step-details">
          <span className="action-icon sage"><Icon name="book" /></span>
          <span className="grow"><strong>{t.details}</strong></span>
          <span className={details ? "rotate" : ""}><Icon name="chevron" size={18} /></span>
        </button>
        {details && (
          <div className="detail-note" id="step-details">
            <p>{text.details}</p>
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
