import { useId } from "react";
import { useT } from "../i18n";
import { Icon } from "./Icon";

// T021: ritual diagrams. Their direction carries meaning, so they are drawn left-to-right in every
// language and never mirror with the text (constitution III). What they show is religious content,
// so the caption comes from the reviewed step text (diagramLabel), not from UI strings.

/** Tawaf: always counter-clockwise, with the Kaaba on the pilgrim's left. */
export function TawafDiagram({ label }: { label: string }) {
  return (
    <figure className="diagram">
      <div className="kaaba-diagram" dir="ltr" aria-hidden="true">
        <span className="orbit orbit-a" />
        <span className="orbit orbit-b" />
        <span className="diagram-kaaba"><Icon name="kaaba" size={40} /></span>
        <span className="direction-arrow">↺</span>
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/** Sa'i: from Safa to Marwah and back, with the green markers between them. */
export function SaiDiagram({ label }: { label: string }) {
  const t = useT();
  const marker = useId();
  return (
    <figure className="diagram">
      <div className="sai-diagram" dir="ltr" aria-hidden="true">
        <svg viewBox="0 0 300 90">
          <defs>
            <marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" />
            </marker>
          </defs>
          <rect className="sai-green" x="120" y="22" width="60" height="46" rx="6" />
          <line className="sai-track out" x1="44" y1="34" x2="256" y2="34" markerEnd={`url(#${marker})`} />
          <line className="sai-track back" x1="256" y1="56" x2="44" y2="56" markerEnd={`url(#${marker})`} />
          <circle className="sai-hill" cx="28" cy="45" r="14" />
          <circle className="sai-hill" cx="272" cy="45" r="14" />
        </svg>
        <div className="sai-labels">
          <span>{t.diagrams.safa}</span>
          <span className="sai-green-label">{t.diagrams.greenMarkers}</span>
          <span>{t.diagrams.marwah}</span>
        </div>
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
