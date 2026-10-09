// T048 (FR-021): offline place detection from the bundled shapes. Pure functions, no network.
import { GEO_REGIONS } from "./places-geo";
import type { GeoRegion, LatLon, Shape } from "./places-geo";

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Accuracy (metres) needed to tell places apart inside Masjid al-Haram, and elsewhere. */
export const HARAM_ACCURACY_M = 50;
export const WIDE_ACCURACY_M = 300;

/** One position from the device. Kept in memory only; never stored or sent (FR-020). */
export interface Fix {
  latitude: number;
  longitude: number;
  /** Radius of the 95% confidence circle, in metres. */
  accuracy: number;
}

export type Detection = { status: "uncertain" } | { status: "outside" } | { status: "near"; region: GeoRegion };

/** Great-circle distance in metres. */
export function distanceM([lat1, lon1]: LatLon, [lat2, lon2]: LatLon) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Ray casting. Fine for shapes a few kilometres across, far from the poles and the antimeridian. */
export function pointInPolygon([lat, lon]: LatLon, points: readonly LatLon[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [latI, lonI] = points[i];
    const [latJ, lonJ] = points[j];
    if (latI > lat !== latJ > lat && lon < ((lonJ - lonI) * (lat - latI)) / (latJ - latI) + lonI) inside = !inside;
  }
  return inside;
}

/** Distance in metres from a point to a segment, in a flat projection around the point (short distances only). */
export function distanceToSegmentM(point: LatLon, from: LatLon, to: LatLon) {
  const k = rad(1) * EARTH_RADIUS_M;
  const project = ([lat, lon]: LatLon) => [(lon - point[1]) * k * Math.cos(rad(point[0])), (lat - point[0]) * k] as const;
  const [ax, ay] = project(from);
  const [bx, by] = project(to);
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

export function contains(shape: Shape, point: LatLon) {
  switch (shape.kind) {
    case "circle":
      return distanceM(shape.center, point) <= shape.radiusM;
    case "corridor":
      return distanceToSegmentM(point, shape.from, shape.to) <= shape.halfWidthM;
    case "polygon":
      return pointInPolygon(point, shape.points);
  }
}

/**
 * Where the pilgrim seems to be: the most specific region containing the position, "outside" when none
 * does, or "uncertain" when the accuracy is too poor to tell (inside Masjid al-Haram the Mataf and the
 * Mas'a are only tens of metres apart, so the limit is tighter there).
 */
export function detectPlace(fix: Fix, regions: readonly GeoRegion[] = GEO_REGIONS): Detection {
  const { latitude, longitude, accuracy } = fix;
  if (![latitude, longitude, accuracy].every(Number.isFinite) || accuracy < 0) return { status: "uncertain" };
  const point: LatLon = [latitude, longitude];
  const matching = regions.filter((r) => contains(r.shape, point)).sort((a, b) => a.level - b.level);
  const limit = matching.some((r) => r.zone === "haram") ? HARAM_ACCURACY_M : WIDE_ACCURACY_M;
  if (accuracy > limit) return { status: "uncertain" };
  return matching[0] ? { status: "near", region: matching[0] } : { status: "outside" };
}
