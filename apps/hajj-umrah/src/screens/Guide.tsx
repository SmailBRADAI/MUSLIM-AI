import { useState } from "react";
import { Icon } from "../components/Icon";
import { ReviewBadge } from "../components/ReviewBadge";
import { RulingTag } from "../components/RulingTag";
import { useT } from "../i18n";

// TODO(T020): drive this screen from content/journeys/umrah.json instead of the prototype's single Tawaf step.
export function Guide({
  complete,
  setComplete,
  saveFailed,
}: {
  complete: boolean;
  setComplete: (value: boolean) => void;
  saveFailed: boolean;
}) {
  const t = useT();
  const [audio, setAudio] = useState(false);
  const [details, setDetails] = useState(false);
  const currentStep = complete ? 3 : 2;
  return (
    <main className="page guide-page">
      <div className="guide-heading">
        <div><span className="eyebrow">{t.umrahGuide}</span><h1>{t.tawaf}</h1></div>
        <span className="step-pill">{currentStep} / 5</span>
      </div>
      <section className="progress-panel">
        <div className="progress-label"><span>{t.progress}</span><strong>{complete ? "60%" : "40%"}</strong></div>
        <div className="progress-track"><span style={{ width: complete ? "60%" : "40%" }} /></div>
        <ol className="steps">
          {[1, 2, 3, 4, 5].map((step) => (
            <li
              key={step}
              className={step < currentStep ? "done" : step === currentStep ? "current" : ""}
              aria-current={step === currentStep ? "step" : undefined}
            >
              {step < currentStep ? <Icon name="check" size={13} /> : step}
            </li>
          ))}
        </ol>
      </section>

      <section className="instruction-card">
        <div className="instruction-meta">
          <span className="ritual-icon"><Icon name="compass" /></span>
          <RulingTag ruling="rukn" />
          <ReviewBadge status="draft" />
        </div>
        <h2>{t.instructionTitle}</h2>
        <p>{t.instruction}</p>
        <div className="kaaba-diagram" aria-hidden="true">
          <span className="orbit orbit-a" />
          <span className="orbit orbit-b" />
          <span className="diagram-kaaba"><Icon name="kaaba" size={40} /></span>
          {/* Tawaf is always counter-clockwise; this must never mirror with text direction. */}
          <span className="direction-arrow">↺</span>
        </div>
      </section>

      <div className="action-list">
        <button className={audio ? "action-row playing" : "action-row"} onClick={() => setAudio(!audio)} aria-pressed={audio}>
          <span className="action-icon"><Icon name={audio ? "volume" : "headphones"} /></span>
          <span className="grow"><strong>{t.audio}</strong><small>{audio ? "••••••••••" : t.audioTime}</small></span>
          <Icon name="chevron" size={18} />
        </button>
        <button className="action-row">
          <span className="action-icon amber"><Icon name="prayer" /></span>
          <span className="grow"><strong>{t.relatedDuas}</strong></span>
          <Icon name="chevron" size={18} />
        </button>
        <button className="action-row" onClick={() => setDetails(!details)} aria-expanded={details} aria-controls="step-details">
          <span className="action-icon sage"><Icon name="book" /></span>
          <span className="grow"><strong>{t.details}</strong></span>
          <span className={details ? "rotate" : ""}><Icon name="chevron" size={18} /></span>
        </button>
        {details && <div className="detail-note" id="step-details">{t.instruction}</div>}
      </div>

      <div className="next-note"><Icon name="sparkle" size={18} /><span>{t.next}</span></div>
      {/* TODO(T020): "Next" opens the next step once the guide is data-driven; it must never un-mark this one. */}
      <button className={complete ? "complete-button completed" : "complete-button"} onClick={() => setComplete(true)}>
        <Icon name="check" />{complete ? t.next : t.complete}<Icon name="arrow" />
      </button>
      <button className="previous-button" onClick={() => setComplete(false)} disabled={!complete}>{t.previous}</button>
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
