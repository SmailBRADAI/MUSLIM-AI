import type { Place } from "../data/types";
import { useT } from "../i18n";

// T047 (FR-019): "you are here" at the top of each step. A schematic drawn in the app, so it works
// offline with no map tiles: the places in the order a pilgrim meets them, and, inside Masjid
// al-Haram, the Mataf, Maqam Ibrahim and the Mas'a. It shows order and grouping, not distances.
// Geography does not turn with the text, so the drawing is left-to-right in every language
// (constitution III). The step's place is filled and carries a pin, and its name is bold and
// underlined, so colour is never the only signal (constitution IV).

/** The route's stops in the order a pilgrim meets them (from the miqat into Makkah, then out to Arafah); each place is shown on one. */
const STOPS = ["miqat", "makkah", "jamarat", "mina", "muzdalifah", "arafah"] as const;
type Stop = (typeof STOPS)[number];

/** Places inside Masjid al-Haram, shown on the inset. */
const HARAM = ["mataf", "maqam", "masa"] as const;
type HaramPlace = (typeof HARAM)[number];
const inHaram = (place: Place): place is HaramPlace => (HARAM as readonly string[]).includes(place);

const stopOf = (place: Place): Stop => (inHaram(place) ? "makkah" : place);

// Route: six stops 60 units apart. Labels sit on the 12-column grid (two columns per stop),
// alternately above and below the line so long names have room.
const stopX = (i: number) => 30 + 60 * i;
const LINE_Y = 38;
/** Grid lines for each stop's label: centred on the stop, two stops wide where there is room. */
const LABEL_COLUMNS: Record<Stop, string> = {
  miqat: "1 / 3",
  makkah: "2 / 6",
  jamarat: "4 / 8",
  mina: "6 / 10",
  muzdalifah: "8 / 12",
  arafah: "11 / 13",
};
const ABOVE: readonly Stop[] = ["makkah", "mina", "arafah"];

/** A map pin whose tip is at (x, y). */
function Pin({ x, y }: { x: number; y: number }) {
  return (
    <g className="place-pin" transform={`translate(${x} ${y})`}>
      <path d="M0 0 C-6 -8 -9 -12 -9 -17 A9 9 0 1 1 9 -17 C9 -12 6 -8 0 0 Z" />
      <circle cy="-17" r="3.5" />
    </g>
  );
}

const hereClass = (base: string, here: boolean) => (here ? `${base} here` : base);

/** Names on a 12-column grid that matches the 360-unit drawing (30 units per column). */
function Labels({ items }: { items: { key: string; text: string; columns: string; here?: boolean }[] }) {
  return (
    <div className="place-labels">
      {items.map(({ key, text, columns, here = false }) => (
        <span key={key} className={hereClass("place-label", here)} style={{ gridColumn: columns }} data-label={key}>
          {text}
        </span>
      ))}
    </div>
  );
}

/** `caption` replaces "I am in …", for Live mode, which only says where the pilgrim seems to be (T048). */
export function PlaceVisual({ place, caption }: { place: Place; caption?: string }) {
  const t = useT();
  const stop = stopOf(place);

  const labels = (above: boolean) => (
    <Labels
      items={STOPS.filter((s) => ABOVE.includes(s) === above).map((s) => ({
        key: s,
        text: t.places[s].name,
        columns: LABEL_COLUMNS[s],
        here: s === stop,
      }))}
    />
  );

  return (
    <figure className="place-visual" data-place={place}>
      <figcaption>{caption ?? t.places[place].here}</figcaption>
      <div className="place-map" dir="ltr" role="img" aria-label={t.placeMapLabel.replace("{place}", t.places[place].name)}>
        <div className="place-route">
          {labels(true)}
          <svg viewBox="0 0 360 52" aria-hidden="true" focusable="false">
            <line className="place-road" x1={stopX(0)} y1={LINE_Y} x2={stopX(STOPS.length - 1)} y2={LINE_Y} />
            {STOPS.map((s, i) =>
              s === "makkah" ? (
                <rect key={s} className={hereClass("place-stop", s === stop)} x={stopX(i) - 9} y={LINE_Y - 9} width="18" height="18" rx="3" data-stop={s} />
              ) : (
                <circle key={s} className={hereClass("place-stop", s === stop)} cx={stopX(i)} cy={LINE_Y} r={s === stop ? 9 : 7} data-stop={s} />
              ),
            )}
            <Pin x={stopX(STOPS.indexOf(stop))} y={LINE_Y - 11} />
          </svg>
          {labels(false)}
        </div>
        {inHaram(place) && <HaramInset place={place} />}
      </div>
    </figure>
  );
}

/** Masjid al-Haram: the Kaaba in the Mataf, Maqam Ibrahim beside it, and the Mas'a from Safa to Marwah
 * (Safa on the left and Marwah on the right, as in the Sa'i diagram). */
function HaramInset({ place }: { place: HaramPlace }) {
  const t = useT();
  const pin = { mataf: { x: 52, y: 34 }, maqam: { x: 124, y: 35 }, masa: { x: 260, y: 35 } }[place];
  return (
    <div className="place-haram">
      <Labels
        items={[
          { key: "maqam", text: t.places.maqam.name, columns: "3 / 6", here: place === "maqam" },
          { key: "safa", text: t.diagrams.safa, columns: "6 / 9" },
          { key: "marwah", text: t.diagrams.marwah, columns: "10 / 13" },
        ]}
      />
      <svg viewBox="0 0 360 100" aria-hidden="true" focusable="false">
        <rect className="haram-outline" x="6" y="4" width="348" height="92" rx="14" />
        <ellipse className={hereClass("place-part", place === "mataf")} cx="95" cy="50" rx="72" ry="40" data-part="mataf" />
        <rect className="haram-kaaba" x="86" y="41" width="18" height="18" rx="2" />
        <rect className={hereClass("place-part", place === "maqam")} x="120" y="37" width="9" height="12" rx="3" data-part="maqam" />
        <rect className={hereClass("place-part", place === "masa")} x="186" y="36" width="148" height="28" rx="14" data-part="masa" />
        <circle className="haram-hill" cx="200" cy="50" r="8" />
        <circle className="haram-hill" cx="320" cy="50" r="8" />
        <Pin {...pin} />
      </svg>
      <Labels
        items={[
          { key: "mataf", text: t.places.mataf.name, columns: "1 / 6", here: place === "mataf" },
          { key: "masa", text: t.places.masa.name, columns: "7 / 12", here: place === "masa" },
        ]}
      />
    </div>
  );
}
