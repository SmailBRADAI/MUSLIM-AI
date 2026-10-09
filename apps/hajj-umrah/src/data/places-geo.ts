// T048 (FR-021): approximate shapes of the pilgrimage places, bundled so Live mode works offline.
//
// APPROXIMATE — PENDING VERIFICATION. These shapes are simplified from public map knowledge of
// OpenStreetMap data (ODbL) and have NOT been checked against OpenStreetMap or the official boundary
// signs. They are good enough to suggest a step, never to decide whether a pilgrim is inside Arafah,
// Muzdalifah, Mina or a miqat; the app always says "seems to be near" and points to the official signs.
// Verify every coordinate before release (tasks: T048, T037).
import type { Place } from "./types";

/** [latitude, longitude] in degrees (WGS 84). */
export type LatLon = readonly [number, number];

export type Shape =
  | { kind: "circle"; center: LatLon; radiusM: number }
  /** A segment with a half-width: every point within halfWidthM of the segment from `from` to `to`. */
  | { kind: "corridor"; from: LatLon; to: LatLon; halfWidthM: number }
  | { kind: "polygon"; points: readonly LatLon[] };

/** What a region is called in the UI (`live.regions.<kind>` in src/i18n). */
export type RegionKind = "maqam" | "mataf" | "masa" | "haram" | "makkah" | "mina" | "jamarat" | "muzdalifah" | "arafah" | "miqat";
export type MiqatId = "dhul-hulayfah" | "juhfah" | "rabigh" | "qarn" | "yalamlam" | "dhat-irq";

export interface GeoRegion {
  id: string;
  kind: RegionKind;
  /** For kind "miqat": which miqat, named in the UI. */
  miqat?: MiqatId;
  /** The place highlighted on the "you are here" visual. */
  place: Place;
  /** Step places performed inside this region, used to suggest a step. */
  matches: readonly Place[];
  /** Lower is more specific; the most specific region containing the point wins. */
  level: 0 | 1 | 2 | 3;
  /** "haram": inside Masjid al-Haram, where a tighter GPS accuracy is needed to tell places apart. */
  zone: "haram" | "wide";
  /** The place has a boundary with a ruling: say "seems to be near" and point to the official signs. */
  boundary: boolean;
  shape: Shape;
}

export const GEO_META = {
  source: ["OpenStreetMap (ODbL), approximate, pending verification"],
  status: "draft",
  version: "0.1.0",
} as const;

/** Shown wherever the shapes are used (FR-015). */
export const GEO_ATTRIBUTION = "© OpenStreetMap contributors";

const KAABA: LatLon = [21.422487, 39.826206];
const HARAM_PLACES = ["mataf", "maqam", "masa"] as const satisfies readonly Place[];

const miqat = (id: string, which: MiqatId, center: LatLon, radiusM: number): GeoRegion => ({
  id,
  kind: "miqat",
  miqat: which,
  place: "miqat",
  matches: ["miqat"],
  level: 2,
  zone: "wide",
  boundary: true,
  shape: { kind: "circle", center, radiusM },
});

export const GEO_REGIONS: readonly GeoRegion[] = [
  // Masjid al-Haram. The two rak'ahs after Tawaf are prayed behind the Maqam or anywhere in the
  // mosque, so the Mataf and the Maqam match each other's steps.
  {
    id: "maqam",
    kind: "maqam",
    place: "maqam",
    matches: ["mataf", "maqam"],
    level: 0,
    zone: "haram",
    boundary: false,
    // About 15 m east-north-east of the Kaaba, facing its door.
    shape: { kind: "circle", center: [21.42262, 39.82634], radiusM: 15 },
  },
  {
    id: "mataf",
    kind: "mataf",
    place: "mataf",
    matches: ["mataf", "maqam"],
    level: 1,
    zone: "haram",
    boundary: false,
    // The open courtyard around the Kaaba and the nearest arcades.
    shape: { kind: "circle", center: KAABA, radiusM: 75 },
  },
  {
    id: "masa",
    kind: "masa",
    place: "masa",
    matches: ["masa"],
    level: 1,
    zone: "haram",
    boundary: false,
    // The Mas'a gallery from Safa (south) to Marwah (north), east of the Mataf.
    shape: { kind: "corridor", from: [21.4218, 39.82735], to: [21.4251, 39.827], halfWidthM: 25 },
  },
  {
    id: "masjid-al-haram",
    kind: "haram",
    place: "makkah",
    matches: HARAM_PLACES,
    level: 2,
    zone: "haram",
    boundary: false,
    shape: { kind: "circle", center: KAABA, radiusM: 300 },
  },
  {
    id: "makkah",
    kind: "makkah",
    place: "makkah",
    matches: ["makkah", ...HARAM_PLACES],
    level: 3,
    zone: "wide",
    boundary: false,
    // The city around the Haram; Mina and Muzdalifah inside it are matched first (more specific).
    shape: { kind: "circle", center: KAABA, radiusM: 10_000 },
  },
  {
    id: "jamarat",
    kind: "jamarat",
    place: "jamarat",
    matches: ["jamarat"],
    level: 1,
    zone: "wide",
    boundary: false,
    // The Jamarat bridge, from Jamrat al-Aqabah (west, towards Makkah) to al-Jamrah as-Sughra (east).
    shape: { kind: "corridor", from: [21.4234, 39.8715], to: [21.4222, 39.8751], halfWidthM: 60 },
  },
  {
    id: "mina",
    kind: "mina",
    place: "mina",
    matches: ["mina", "jamarat"],
    level: 2,
    zone: "wide",
    boundary: true,
    // The valley from Jamrat al-Aqabah east to Wadi Muhassir.
    shape: {
      kind: "polygon",
      points: [
        [21.4275, 39.87],
        [21.429, 39.885],
        [21.42, 39.901],
        [21.408, 39.905],
        [21.403, 39.896],
        [21.412, 39.88],
        [21.418, 39.87],
      ],
    },
  },
  {
    id: "muzdalifah",
    kind: "muzdalifah",
    place: "muzdalifah",
    matches: ["muzdalifah"],
    level: 2,
    zone: "wide",
    boundary: true,
    // From Wadi Muhassir south-east to the Ma'zamain pass towards Arafah; includes al-Mash'ar al-Haram.
    shape: {
      kind: "polygon",
      points: [
        [21.401, 39.9075],
        [21.388, 39.942],
        [21.37, 39.937],
        [21.384, 39.903],
      ],
    },
  },
  {
    id: "arafah",
    kind: "arafah",
    place: "arafah",
    matches: ["arafah"],
    level: 2,
    zone: "wide",
    boundary: true,
    // The plain of Arafah with Jabal al-Rahmah, and Masjid Namirah on its western edge (Wadi Uranah,
    // just west of it, is not part of Arafah: one more reason never to rule on the boundary).
    shape: {
      kind: "polygon",
      points: [
        [21.372, 39.964],
        [21.37, 39.995],
        [21.348, 40.0],
        [21.335, 39.98],
        [21.342, 39.96],
      ],
    },
  },
  // The miqats: the mosque or town where pilgrims enter ihram.
  miqat("dhul-hulayfah", "dhul-hulayfah", [24.4136, 39.5431], 2000), // Abyar Ali, Madinah
  miqat("juhfah", "juhfah", [22.7072, 39.1444], 2000), // Al-Juhfah mosque
  miqat("rabigh", "rabigh", [22.7986, 39.0349], 4000), // Rabigh, used for Al-Juhfah
  miqat("qarn", "qarn", [21.6306, 40.4231], 2000), // Qarn al-Manazil, As-Sayl al-Kabir
  miqat("yalamlam", "yalamlam", [20.5464, 39.8714], 2000), // Yalamlam, As-Sa'diyyah
  miqat("dhat-irq", "dhat-irq", [21.9303, 40.4231], 2000), // Dhat Irq
];
