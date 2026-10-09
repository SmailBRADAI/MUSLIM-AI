import { IHRAM_RULES, MIQATS } from "../data/diagrams";
import type { Diagram } from "../data/types";
import { useT } from "../i18n";
import { SaiDiagram, TawafDiagram } from "./Diagrams";

// T049: original teaching illustrations for the Umrah (miqats, ihram clothing, ihram prohibitions and permitted
// things). Drawn in the app as simple abstract shapes with no faces; none of them copies, traces or reuses
// the pictures of any publication. Geography and clothing do not mirror with text direction, so the drawings
// are dir="ltr" in every language (constitution III). What they teach is religious content, so every label
// comes from the reviewed step text (diagramItems), and each drawing has a visible caption and an accessible
// name. Status is never colour alone: prohibited things carry a cross mark and the heading says "forbidden".

type Items = Record<string, string> | undefined;
const label = (items: Items, key: string) => items?.[key] ?? "";

/** The five miqats around Makkah, as numbered points on a schematic (directions approximate, not to scale). */
const MIQAT_POINTS: Record<(typeof MIQATS)[number], { x: number; y: number }> = {
  1: { x: 66, y: 72 }, // Al-Juhfah: north-west, towards the Red Sea coast
  2: { x: 268, y: 136 }, // As-Sayl al-Kabir: east
  3: { x: 120, y: 30 }, // Dhul-Hulayfah: north, towards Madinah
  4: { x: 196, y: 204 }, // Yalamlam: south
  5: { x: 244, y: 52 }, // Dhat Irq: north-east
};
const MAKKAH = { x: 160, y: 122 };

export function MiqatMap({ caption, items }: { caption: string; items: Items }) {
  const t = useT();
  return (
    <figure className="diagram miqat-figure">
      <div className="miqat-map" dir="ltr" role="img" aria-label={caption}>
        <svg viewBox="0 0 320 230" aria-hidden="true" focusable="false">
          <path className="miqat-coast" d="M24 14 C46 70 14 126 40 218" />
          {MIQATS.map((n) => (
            <line key={n} className="miqat-line" x1={MAKKAH.x} y1={MAKKAH.y} x2={MIQAT_POINTS[n].x} y2={MIQAT_POINTS[n].y} />
          ))}
          <rect className="miqat-kaaba" x={MAKKAH.x - 11} y={MAKKAH.y - 11} width="22" height="22" rx="3" />
          <rect className="miqat-kaaba-band" x={MAKKAH.x - 11} y={MAKKAH.y - 5} width="22" height="3" />
          <text className="miqat-makkah" x={MAKKAH.x - 18} y={MAKKAH.y + 4} textAnchor="end">{t.places.makkah.name}</text>
          {MIQATS.map((n) => (
            <g key={n} className="miqat-point" transform={`translate(${MIQAT_POINTS[n].x} ${MIQAT_POINTS[n].y})`}>
              <circle r="12" />
              <text y="5" textAnchor="middle">{n}</text>
            </g>
          ))}
        </svg>
      </div>
      <ol className="diagram-legend miqat-legend">
        {MIQATS.map((n) => (
          <li key={n}>
            <span className="legend-num" aria-hidden="true">{n}</span>
            <span><strong>{label(items, `miqat.${n}.name`)}</strong> {label(items, `miqat.${n}.for`)}</span>
          </li>
        ))}
      </ol>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** Small cross mark: the thing beside it is forbidden. */
function Cross({ x = 26, y = 6 }: { x?: number; y?: number }) {
  return (
    <g className="glyph-no" transform={`translate(${x} ${y})`}>
      <circle r="6" />
      <path d="M-2.4 -2.4l4.8 4.8M2.4 -2.4l-4.8 4.8" />
    </g>
  );
}

/** One simple geometric icon per prohibition, in a 32 x 32 box, with a cross mark in the corner. */
function Glyph({ name, at }: { name: (typeof ICONS)[number]; at?: { x: number; y: number } }) {
  return (
    <svg className="rules-glyph" viewBox="0 0 32 32" aria-hidden="true" focusable="false" data-glyph={name} {...(at ? { x: at.x, y: at.y, width: 32, height: 32 } : {})}>
      {name === "sewn" && <path d="M10 6 4 11l4 4 2-2v14h12V13l2 2 4-4-6-5q-6 4-12 0Z" />}
      {name === "headCover" && (
        <>
          <path d="M5 20Q5 8 16 8t11 12Z" />
          <path d="M4 20h24v4H4z" />
        </>
      )}
      {name === "gloves" && (
        <>
          <rect x="9" y="14" width="14" height="13" rx="3" />
          <rect x="9" y="6" width="3" height="9" rx="1.5" />
          <rect x="13" y="4" width="3" height="11" rx="1.5" />
          <rect x="17" y="5" width="3" height="10" rx="1.5" />
          <rect x="21" y="8" width="3" height="7" rx="1.5" />
        </>
      )}
      {name === "niqab" && (
        <>
          <ellipse cx="16" cy="15" rx="8" ry="11" />
          <rect x="11" y="12" width="10" height="3" rx="1.5" />
          <path d="M9 21h14" />
        </>
      )}
      {name === "perfume" && (
        <>
          <rect x="10" y="14" width="10" height="13" rx="2" />
          <rect x="13" y="10" width="4" height="4" />
          <path d="M12 8h6M22 9h4M22 12l4 2M22 6l4-2" />
        </>
      )}
      {name === "hair" && (
        <>
          <path d="M9 5l14 20M23 5 9 25" />
          <circle cx="8" cy="26" r="3" />
          <circle cx="24" cy="26" r="3" />
        </>
      )}
      {name === "nails" && (
        <>
          <path d="M12 28V12Q12 6 16 6t4 6v16" />
          <path d="M13.5 12Q13.5 8 16 8t2.5 4Z" />
          <path d="M5 19h5M22 19h5" />
        </>
      )}
      {name === "hunting" && (
        <>
          <circle cx="16" cy="16" r="9" />
          <path d="M16 3v8M16 21v8M3 16h8M21 16h8" />
        </>
      )}
      {name === "trees" && (
        <>
          <circle cx="16" cy="12" r="8" />
          <rect x="14" y="19" width="4" height="9" />
        </>
      )}
      {name === "marriage" && (
        <>
          <circle cx="12" cy="18" r="7" />
          <circle cx="20" cy="18" r="7" />
        </>
      )}
      {name === "intercourse" && <path d="M16 27C4 18 6 8 12 8c2 0 4 2 4 4 0-2 2-4 4-4 6 0 8 10-4 19Z" />}
      {name === "touching" && (
        <>
          <path d="M3 16Q16 5 29 16 16 27 3 16Z" />
          <circle cx="16" cy="16" r="4" />
        </>
      )}
      <Cross />
    </svg>
  );
}
const ICONS = IHRAM_RULES.groups.flatMap((g) => g.items);

/** What ihram forbids (icons, grouped: men, women, everyone) and what it allows (a ticked list). */
export function IhramRules({ caption, items }: { caption: string; items: Items }) {
  return (
    <figure className="diagram rules-figure">
      <div className="rules">
        <div className="rules-head"><Cross2 />{label(items, "ihram-rules.prohibited")}</div>
        {IHRAM_RULES.groups.map((group) => (
          <section key={group.heading} className="rules-group" aria-label={label(items, `ihram-rules.${group.heading}`)}>
            <div className="rules-group-title" aria-hidden="true">{label(items, `ihram-rules.${group.heading}`)}</div>
            <ul className="rules-grid">
              {group.items.map((k) => (
                <li key={k}>
                  <Glyph name={k} />
                  <span>{label(items, `ihram-rules.${k}`)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="rules-head ok"><Tick />{label(items, "ihram-rules.permitted")}</div>
        <ul className="rules-list">
          {IHRAM_RULES.permitted.map((k) => (
            <li key={k}><Tick small />{label(items, `ihram-rules.ok.${k}`)}</li>
          ))}
        </ul>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function Cross2() {
  return (
    <svg className="head-mark no" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="9" />
      <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" />
    </svg>
  );
}
function Tick({ small = false }: { small?: boolean }) {
  return (
    <svg className={small ? "head-mark ok small" : "head-mark ok"} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="9" />
      <path d="M5.5 10.5 8.5 13.5 14.5 7" />
    </svg>
  );
}

/**
 * Ihram clothing as abstract figures with no faces: a man in izar and rida with sandals; the same man in the
 * Umrah Tawaf with the right shoulder uncovered (idtiba'; his right is on the left of the drawing, as he
 * faces us); and a woman in ordinary clothing and a head covering, with a niqab and gloves crossed out.
 */
export function IhramDress({ caption, items }: { caption: string; items: Items }) {
  return (
    <figure className="diagram dress-figure">
      <div className="dress-grid" role="img" aria-label={[label(items, "ihram-dress.man"), label(items, "ihram-dress.tawaf"), label(items, "ihram-dress.woman")].join(" ")}>
        <div className="dress-cell">
          <div className="dress-art" dir="ltr">
            <svg viewBox="0 0 100 150" aria-hidden="true" focusable="false">
              <circle className="dress-head" cx="50" cy="20" r="11" />
              <path className="dress-cloth" d="M26 40Q50 30 74 40L78 98H22Z" />
              <path className="dress-fold" d="M50 36v62" />
              <path className="dress-cloth" d="M28 92h44l5 46H23Z" />
              <rect className="dress-sandal" x="27" y="141" width="18" height="5" rx="2" />
              <rect className="dress-sandal" x="55" y="141" width="18" height="5" rx="2" />
            </svg>
          </div>
          <span aria-hidden="true">{label(items, "ihram-dress.man")}</span>
        </div>
        <div className="dress-cell">
          <div className="dress-art" dir="ltr">
            <svg viewBox="0 0 100 150" aria-hidden="true" focusable="false" data-bare="right">
              <circle className="dress-head" cx="50" cy="20" r="11" />
              <path className="dress-bare" d="M26 40Q38 36 44 38L40 62 22 96 18 70Z" />
              <path className="dress-cloth" d="M44 38Q60 32 74 40L78 98H36L40 62Z" />
              <path className="dress-fold" d="M44 38 40 62" />
              <path className="dress-cloth" d="M28 92h44l5 46H23Z" />
              <rect className="dress-sandal" x="27" y="141" width="18" height="5" rx="2" />
              <rect className="dress-sandal" x="55" y="141" width="18" height="5" rx="2" />
            </svg>
          </div>
          <span aria-hidden="true">{label(items, "ihram-dress.tawaf")}</span>
        </div>
        <div className="dress-cell">
          <div className="dress-art" dir="ltr">
            <svg viewBox="0 0 140 150" aria-hidden="true" focusable="false">
              <path className="dress-cloth" d="M24 24Q50 2 76 24L80 62H20Z" />
              <ellipse className="dress-head" cx="50" cy="30" rx="10" ry="12" />
              <path className="dress-fold" d="M40 36Q50 44 60 36" />
              <path className="dress-cloth" d="M24 58h52l12 84H12Z" />
              <Glyph name="niqab" at={{ x: 96, y: 18 }} />
              <Glyph name="gloves" at={{ x: 96, y: 74 }} />
            </svg>
          </div>
          <span aria-hidden="true">{label(items, "ihram-dress.woman")}</span>
        </div>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** The illustration for one diagram id, with its caption and labels from the step text. */
export function DiagramView({ diagram, caption, items }: { diagram: Diagram; caption: string; items: Items }) {
  switch (diagram) {
    case "tawaf":
      return <TawafDiagram label={caption} items={items} />;
    case "sai":
      return <SaiDiagram label={caption} items={items} />;
    case "miqat":
      return <MiqatMap caption={caption} items={items} />;
    case "ihram-dress":
      return <IhramDress caption={caption} items={items} />;
    case "ihram-rules":
      return <IhramRules caption={caption} items={items} />;
  }
}
