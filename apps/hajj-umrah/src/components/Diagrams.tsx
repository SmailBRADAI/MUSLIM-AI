import { useId } from "react";
import { useT } from "../i18n";

// T021, T049: ritual diagrams. Their direction carries meaning, so they are drawn left-to-right in every
// language and never mirror with the text (constitution III). What they show is religious content, so the
// caption (and any label that is a ruling, such as which Tawaf path is valid) comes from the reviewed step
// text (diagramLabel, diagramItems), not from UI strings. Names of places are UI strings.
// All drawings are original and abstract. Colour is never the only signal: paths differ in line style,
// carry a mark, and are named in the legend.

type Items = Record<string, string> | undefined;

function Mark({ kind }: { kind: "ok" | "no" }) {
  return (
    <svg className={`legend-mark ${kind}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="7.5" />
      {kind === "ok" ? <path d="M4.5 8.5 7 11l4.5-5.5" /> : <path d="M5 5l6 6M11 5l-6 6" />}
    </svg>
  );
}

/**
 * Tawaf seen from above, north up: the Kaaba (drawn as a diamond so its four corners point east, north,
 * west and south), the Black Stone at the east corner, the Yemeni Corner at the south corner, and the Hijr
 * (Hijr Ismail) as a semicircle on the north-west wall. The pilgrim goes counter-clockwise, so the Kaaba is
 * on the left. The valid path goes round outside the Hijr; the dashed path through it is not a valid Tawaf.
 */
export function TawafDiagram({ label, items }: { label: string; items?: Items }) {
  const t = useT();
  const marker = useId();
  const invalid = items?.["tawaf.invalid"];
  const valid = items?.["tawaf.valid"];
  const names = [t.diagrams.blackStone, t.diagrams.yemeniCorner, t.diagrams.hijr];
  // Four counter-clockwise arcs of the ring (east, north, west, south, east), each with an arrow head.
  const arcs = ["M262 115 A102 82 0 0 0 160 33", "M160 33 A102 82 0 0 0 58 115", "M58 115 A102 82 0 0 0 160 197", "M160 197 A102 82 0 0 0 262 115"];
  return (
    <figure className="diagram tawaf-figure">
      <div className="kaaba-diagram" dir="ltr" role="img" aria-label={label} data-direction="counterclockwise">
        <svg viewBox="0 0 320 230" aria-hidden="true" focusable="false">
          <defs>
            <marker id={marker} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" />
            </marker>
          </defs>
          {arcs.map((d, i) => (
            <path key={i} className="tawaf-valid" d={d} markerEnd={`url(#${marker})`} />
          ))}
          <path className="tawaf-invalid" d="M184 40 L150 92 L120 112 L66 122" />
          <path className="tawaf-hijr" d="M160 85 A21.2 21.2 0 0 0 130 115" />
          <polygon className="tawaf-kaaba" points="190,115 160,85 130,115 160,145" />
          <circle className="tawaf-stone" cx="190" cy="115" r="5" />
          <g className="tawaf-no" transform="translate(170 56)">
            <circle r="8" />
            <path d="M-3.5 -3.5l7 7M3.5 -3.5l-7 7" />
          </g>
          <g className="tawaf-badges">
            {[
              { n: 1, x: 214, y: 115 },
              { n: 2, x: 160, y: 168 },
              { n: 3, x: 108, y: 84 },
            ].map(({ n, x, y }) => (
              <g key={n} transform={`translate(${x} ${y})`}>
                <circle r="10" />
                <text y="4" textAnchor="middle">{n}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>
      <ol className="diagram-legend">
        {names.map((name, i) => (
          <li key={i}><span className="legend-num" aria-hidden="true">{i + 1}</span>{name}</li>
        ))}
        {valid && <li><Mark kind="ok" />{valid}</li>}
        {invalid && <li><Mark kind="no" />{invalid}</li>}
      </ol>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/**
 * Sa'i: from Safa to Marwah and back, with the two green markers between them and, between the markers,
 * the stretch where men go fast (women walk the whole way). The legend line says so in words.
 */
export function SaiDiagram({ label, items }: { label: string; items?: Items }) {
  const t = useT();
  const marker = useId();
  const men = items?.["sai.menRun"];
  const women = items?.["sai.womenWalk"];
  return (
    <figure className="diagram">
      <div className="sai-diagram" dir="ltr" role="img" aria-label={label}>
        <svg viewBox="0 0 300 90">
          <defs>
            <marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" />
            </marker>
          </defs>
          <rect className="sai-green" x="120" y="22" width="60" height="46" rx="6" />
          <line className="sai-track out" x1="44" y1="34" x2="256" y2="34" markerEnd={`url(#${marker})`} />
          <line className="sai-track back" x1="256" y1="56" x2="44" y2="56" markerEnd={`url(#${marker})`} />
          <line className="sai-run" x1="120" y1="34" x2="180" y2="34" />
          <line className="sai-run" x1="120" y1="56" x2="180" y2="56" />
          <line className="sai-post" x1="120" y1="14" x2="120" y2="76" />
          <line className="sai-post" x1="180" y1="14" x2="180" y2="76" />
          <circle className="sai-hill" cx="28" cy="45" r="14" />
          <circle className="sai-hill" cx="272" cy="45" r="14" />
        </svg>
        <div className="sai-labels">
          <span>{t.diagrams.safa}</span>
          <span className="sai-green-label">{t.diagrams.greenMarkers}</span>
          <span>{t.diagrams.marwah}</span>
        </div>
      </div>
      {(men || women) && (
        <ul className="diagram-legend sai-legend">
          {men && <li><svg className="legend-swatch" viewBox="0 0 28 10" aria-hidden="true" focusable="false"><line className="swatch-run" x1="2" y1="5" x2="26" y2="5" /></svg>{men}</li>}
          {women && <li><svg className="legend-swatch" viewBox="0 0 28 10" aria-hidden="true" focusable="false"><line className="swatch-walk" x1="2" y1="5" x2="26" y2="5" /></svg>{women}</li>}
        </ul>
      )}
      <figcaption>{label}</figcaption>
    </figure>
  );
}
