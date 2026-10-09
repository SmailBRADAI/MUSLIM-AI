import { useT } from "../i18n";
import { Icon } from "./Icon";

// T021: ritual diagrams. Their direction carries meaning, so they are drawn left-to-right in every
// language and never mirror with the text (constitution III).

/** Tawaf: always counter-clockwise, with the Kaaba on the pilgrim's left. */
export function TawafDiagram() {
  const t = useT();
  return (
    <div className="kaaba-diagram" dir="ltr" role="img" aria-label={t.diagrams.tawaf}>
      <span className="orbit orbit-a" />
      <span className="orbit orbit-b" />
      <span className="diagram-kaaba"><Icon name="kaaba" size={40} /></span>
      <span className="direction-arrow">↺</span>
    </div>
  );
}

/** Sa'i: from Safa to Marwah is one round; the green markers are where men walk fast. */
export function SaiDiagram() {
  const t = useT();
  return (
    <div className="sai-diagram" dir="ltr" role="img" aria-label={t.diagrams.sai}>
      <svg viewBox="0 0 300 90" aria-hidden="true">
        <rect className="sai-green" x="120" y="22" width="60" height="46" rx="6" />
        <line className="sai-track" x1="40" y1="34" x2="260" y2="34" markerEnd="url(#sai-head)" />
        <line className="sai-track back" x1="260" y1="56" x2="40" y2="56" markerEnd="url(#sai-head)" />
        <circle className="sai-hill" cx="28" cy="45" r="14" />
        <circle className="sai-hill" cx="272" cy="45" r="14" />
        <defs>
          <marker id="sai-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" />
          </marker>
        </defs>
      </svg>
      <div className="sai-labels">
        <span>{t.diagrams.safa}</span>
        <span>{t.diagrams.marwah}</span>
      </div>
    </div>
  );
}
