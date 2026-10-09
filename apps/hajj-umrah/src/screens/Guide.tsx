import { useState } from "react";
import { Icon } from "../components/Icon";
import { ReviewBadge } from "../components/ReviewBadge";
import { RulingTag } from "../components/RulingTag";
import type { StepTexts } from "../data/content";
import { completion, currentStep, orderedSteps } from "../data/progress";
import { displayStatus } from "../data/types";
import type { Journey } from "../data/types";
import { useT } from "../i18n";

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
  const step = steps[index];
  const text = texts[step.id];
  const done = completed.includes(step.id);
  const next = steps[index + 1];
  const percent = Math.round(completion(journey, completed) * 100);
  const otherSchools = step.rulingNote ? String(text[step.rulingNote] ?? "") : "";

  const goTo = (i: number) => {
    setIndex(i);
    setDetails(false);
  };
  const markDone = async () => {
    if (!done) await onStepDone(step.id, true);
    if (next) goTo(index + 1);
  };

  return (
    <main className="page guide-page">
      <div className="guide-heading">
        <div><span className="eyebrow">{t.umrahGuide}</span><h1>{text.title}</h1></div>
        <span className="step-pill">{index + 1} / {steps.length}</span>
      </div>
      <section className="progress-panel">
        <div className="progress-label"><span>{t.progress}</span><strong>{percent}%</strong></div>
        <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
        <ol className="steps">
          {steps.map((s, i) => {
            const isDone = completed.includes(s.id);
            return (
              <li
                key={s.id}
                className={isDone ? "done" : i === index ? "current" : ""}
                aria-current={i === index ? "step" : undefined}
                aria-label={`${texts[s.id].title}${isDone ? ` (${t.stepDone})` : ""}`}
              >
                {isDone ? <Icon name="check" size={13} /> : i + 1}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="instruction-card">
        <div className="instruction-meta">
          <span className="ritual-icon"><Icon name="compass" /></span>
          <RulingTag ruling={step.ruling} views={step.rulingViews} />
          <ReviewBadge status={displayStatus(step, text)} />
        </div>
        <h2>{t.instructionTitle}</h2>
        <p>{text.instruction}</p>
        {step.diagram === "tawaf" && (
          <div className="kaaba-diagram" aria-hidden="true">
            <span className="orbit orbit-a" />
            <span className="orbit orbit-b" />
            <span className="diagram-kaaba"><Icon name="kaaba" size={40} /></span>
            {/* Tawaf is always counter-clockwise; this must never mirror with text direction. */}
            <span className="direction-arrow">↺</span>
          </div>
        )}
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

      {next && <div className="next-note"><Icon name="sparkle" size={18} /><span>{t.nextStep}: {texts[next.id].title}</span></div>}
      <button className={done ? "complete-button completed" : "complete-button"} onClick={markDone} disabled={done && !next}>
        <Icon name="check" />
        {done ? (next ? t.nextStep : t.stepDone) : t.complete}
        <Icon name="arrow" />
      </button>
      {done && <button className="previous-button" onClick={() => onStepDone(step.id, false)}>{t.undo}</button>}
      <button className="previous-button" onClick={() => goTo(index - 1)} disabled={index === 0}>{t.previous}</button>
      {saveFailed ? (
        <p className="save-note save-failed" role="alert"><Icon name="shield" size={16} />{t.saveFailed}</p>
      ) : (
        <p className="save-note"><Icon name="shield" size={16} />{t.reassurance}</p>
      )}
    </main>
  );
}

/** Shown for Hajj journeys until their reviewed content exists (T031). */
export function GuideNotReady() {
  const t = useT();
  return (
    <main className="page guide-page">
      <h1>{t.guide}</h1>
      <p className="save-note" role="status"><Icon name="shield" size={16} />{t.guideNotReady}</p>
    </main>
  );
}
