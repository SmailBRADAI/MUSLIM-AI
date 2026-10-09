import { isDiagram } from "./types.ts";
import type { Diagram, Step } from "./types.ts";

// T049: the illustrations of a step and the reviewed labels each one needs. Labels that carry religious
// content (who uses which miqat, what ihram forbids, which Tawaf path is valid) are step text, not UI
// strings (constitution I): `diagramLabel` is the caption of the step's first illustration, and
// `diagramItems` holds everything else, keyed as below.

/** The step's illustrations in order; an unknown id is dropped so a bad pack cannot crash the Guide. */
export function diagramsOf(step: Pick<Step, "diagram">): Diagram[] {
  const list = step.diagram === undefined ? [] : Array.isArray(step.diagram) ? step.diagram : [step.diagram];
  return list.filter(isDiagram);
}

const MIQATS = [1, 2, 3, 4, 5] as const;
const PROHIBITED = ["sewn", "headCover", "gloves", "niqab", "perfume", "hair", "nails", "hunting", "trees", "marriage", "intercourse", "touching"] as const;
const PERMITTED = ["ghusl", "scent", "scratch", "wear", "shade", "livestock", "poultry", "sea", "insects", "fawasiq"] as const;

/** The grouped keys of the ihram rules grid (the Guide and the checks read the same lists). */
export const IHRAM_RULES = {
  /** Each group: heading key, then its items. */
  groups: [
    { heading: "men", items: ["sewn", "headCover"] },
    { heading: "women", items: ["gloves", "niqab"] },
    { heading: "all", items: ["perfume", "hair", "nails", "hunting", "trees", "marriage", "intercourse", "touching"] },
  ],
  permitted: PERMITTED,
} as const;

/** Keys each illustration needs in `diagramItems`. The Tawaf and Sa'i legends are optional (Hajj steps use those diagrams too). */
export const DIAGRAM_ITEMS: Record<Diagram, readonly string[]> = {
  tawaf: [],
  sai: [],
  miqat: MIQATS.flatMap((n) => [`miqat.${n}.name`, `miqat.${n}.for`]),
  "ihram-dress": ["ihram-dress.man", "ihram-dress.tawaf", "ihram-dress.woman"],
  "ihram-rules": [
    "ihram-rules.prohibited",
    "ihram-rules.permitted",
    "ihram-rules.men",
    "ihram-rules.women",
    "ihram-rules.all",
    ...PROHIBITED.map((k) => `ihram-rules.${k}`),
    ...PERMITTED.map((k) => `ihram-rules.ok.${k}`),
  ],
};

/** Keys missing for these illustrations: their items, and the caption of every one after the first. */
export function requiredDiagramItems(diagrams: readonly Diagram[]): string[] {
  return diagrams.flatMap((d, i) => [...DIAGRAM_ITEMS[d], ...(i > 0 ? [`${d}.caption`] : [])]);
}

export { MIQATS };
