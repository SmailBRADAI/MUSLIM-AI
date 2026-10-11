import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { ReviewBadge } from "../components/ReviewBadge";
import { buildDocs, search } from "../data/ask";
import type { StepTexts } from "../data/content";
import type { Journey } from "../data/types";
import { useLanguage, useT } from "../i18n";

/** T059 (FR-035): ask a question; the answer is existing reviewed content, never generated text. */
export function Ask({ journey, texts, onOpenStep }: { journey: Journey | null; texts: StepTexts | null; onOpenStep: (stepId: string) => void }) {
  const t = useT();
  const language = useLanguage();
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const docs = useMemo(() => (journey && texts ? buildDocs(journey, texts, language) : []), [journey, texts, language]);
  const results = useMemo(() => (asked ? search(asked, docs) : []), [asked, docs]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setAsked(draft.trim() || null);
  };

  return (
    <main className="page ask-page">
      <h1>{t.ask.title}</h1>
      <p className="ask-intro">{t.ask.intro}</p>
      <form className="ask-form" onSubmit={submit} role="search">
        <label htmlFor="ask-input">{t.ask.label}</label>
        <input id="ask-input" type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.ask.placeholder} enterKeyHint="search" />
        <button type="submit" className="complete-button"><Icon name="sparkle" />{t.ask.button}</button>
      </form>

      {asked && (
        <section aria-live="polite" aria-labelledby="ask-results">
          <h2 id="ask-results">{t.ask.resultsFor.replace("{q}", asked)}</h2>
          {results.length === 0 ? (
            <p className="ask-none">{t.ask.none}</p>
          ) : (
            <ul className="ask-results">
              {results.map(({ doc, excerpt }) => (
                <li key={`${doc.kind}:${doc.id}`} className="ask-result">
                  <div className="ask-result-head">
                    <small>{doc.kind === "step" ? t.ask.step : t.ask.supplication}</small>
                    <ReviewBadge status={doc.status} />
                  </div>
                  <h3>{doc.title}</h3>
                  {doc.arabic && <p className="supplication-arabic" lang="ar" dir="rtl">{doc.arabic}</p>}
                  <p>{excerpt}</p>
                  <p className="ask-sources"><strong>{t.ask.sources}:</strong> <bdi lang="ar" dir="rtl">{doc.sources.join("؛ ")}</bdi></p>
                  {doc.kind === "step" && (
                    <button type="button" className="pack-button" onClick={() => onOpenStep(doc.id)}>{t.ask.openStep}<Icon name="arrow" size={18} /></button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="ask-scholar"><Icon name="shield" size={16} />{t.ask.scholar}</p>
        </section>
      )}
    </main>
  );
}
