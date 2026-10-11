import { useEffect, useState } from "react";
import { getSetting, setSetting } from "../data/db";
import { LAP_TOTAL } from "../data/laps";
import type { LapKind } from "../data/laps";
import { useT } from "../i18n";
import { Icon } from "./Icon";

/** T060 (FR-036): counts the seven laps of Tawaf or Sa'i; the count is kept on the device so closing the app loses nothing. */
export function LapCounter({ stepId, kind }: { stepId: string; kind: LapKind }) {
  const t = useT();
  const key = `laps:${stepId}`;
  const [count, setCount] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSetting<number>(key)
      .then((stored) => {
        if (!cancelled && Number.isInteger(stored) && stored! >= 0 && stored! <= LAP_TOTAL) setCount(stored!);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key]);

  const change = (next: number) => {
    setCount(next);
    setSaveFailed(false);
    setSetting(key, next).catch(() => setSaveFailed(true));
  };
  const done = count >= LAP_TOTAL;
  const progress = t.laps.progress.replace("{n}", String(count)).replace("{total}", String(LAP_TOTAL));

  return (
    <section className="lap-counter" aria-labelledby={`${key}-title`}>
      <h2 id={`${key}-title`}>{kind === "tawaf" ? t.laps.tawafTitle : t.laps.saiTitle}</h2>
      <p className="lap-hint">{kind === "tawaf" ? t.laps.tawafHint : t.laps.saiHint}</p>
      <p className="lap-count" role="status" aria-live="polite"><strong>{progress}</strong>{done && <span> · {t.laps.complete}</span>}</p>
      <div className="lap-dots" aria-hidden="true">
        {Array.from({ length: LAP_TOTAL }, (_, i) => <span key={i} className={i < count ? "on" : ""} />)}
      </div>
      <button type="button" className="complete-button lap-add" disabled={done} onClick={() => change(count + 1)}>
        <Icon name="check" />{kind === "tawaf" ? t.laps.tawafAdd : t.laps.saiAdd}
      </button>
      <div className="lap-secondary">
        <button type="button" className="pack-button" disabled={count === 0} onClick={() => change(count - 1)}>{t.laps.undo}</button>
        <button type="button" className="pack-button" disabled={count === 0} onClick={() => change(0)}>{t.laps.reset}</button>
      </div>
      {saveFailed && <p className="save-note save-failed" role="alert">{t.laps.notSaved}</p>}
    </section>
  );
}
