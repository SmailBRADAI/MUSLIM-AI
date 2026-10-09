// T048: offline place detection for Live mode.
import { describe, expect, it } from "vitest";
import { contains, detectPlace, distanceM, distanceToSegmentM, pointInPolygon } from "../../src/data/geofence";
import type { Fix } from "../../src/data/geofence";
import { GEO_ATTRIBUTION, GEO_META, GEO_REGIONS } from "../../src/data/places-geo";
import type { LatLon } from "../../src/data/places-geo";
import { PLACES } from "../../src/data/types";
import { POINTS } from "./geo-points";


const at = ([latitude, longitude]: LatLon, accuracy = 10): Fix => ({ latitude, longitude, accuracy });
const regionAt = (point: LatLon, accuracy = 10) => {
  const d = detectPlace(at(point, accuracy));
  return d.status === "near" ? d.region.id : d.status;
};

describe("geometry", () => {
  it("measures distances on the Earth", () => {
    // One degree of latitude is about 111.2 km.
    expect(distanceM([21, 39], [22, 39])).toBeCloseTo(111_195, -2);
    expect(distanceM([21.4225, 39.8262], [21.4225, 39.8262])).toBe(0);
  });

  it("finds points inside a polygon, including a concave one", () => {
    const square: LatLon[] = [[0, 0], [0, 1], [1, 1], [1, 0]];
    expect(pointInPolygon([0.5, 0.5], square)).toBe(true);
    expect(pointInPolygon([1.5, 0.5], square)).toBe(false);
    // A "U": the notch between the arms is outside.
    const u: LatLon[] = [[0, 0], [0, 3], [3, 3], [3, 2], [1, 2], [1, 1], [3, 1], [3, 0]];
    expect(pointInPolygon([2, 1.5], u)).toBe(false);
    expect(pointInPolygon([2, 0.5], u)).toBe(true);
    expect(pointInPolygon([0.5, 1.5], u)).toBe(true);
  });

  it("measures the distance to a segment, clamped at its ends", () => {
    const from: LatLon = [21.42, 39.82];
    const to: LatLon = [21.43, 39.82];
    expect(distanceToSegmentM([21.425, 39.82], from, to)).toBeCloseTo(0, 5);
    // 0.001° of longitude at 21.4° N is about 103.6 m.
    expect(distanceToSegmentM([21.425, 39.821], from, to)).toBeCloseTo(103.6, 0);
    // Beyond the end: the distance to the end point.
    expect(distanceToSegmentM([21.431, 39.82], from, to)).toBeCloseTo(distanceM([21.431, 39.82], to), 0);
  });

  it("checks circles, corridors and polygons", () => {
    expect(contains({ kind: "circle", center: [21.42, 39.82], radiusM: 100 }, [21.4205, 39.82])).toBe(true);
    expect(contains({ kind: "circle", center: [21.42, 39.82], radiusM: 50 }, [21.4205, 39.82])).toBe(false);
    expect(contains({ kind: "corridor", from: [21.42, 39.82], to: [21.43, 39.82], halfWidthM: 120 }, [21.425, 39.821])).toBe(true);
    expect(contains({ kind: "corridor", from: [21.42, 39.82], to: [21.43, 39.82], halfWidthM: 90 }, [21.425, 39.821])).toBe(false);
  });
});

describe("detectPlace", () => {
  it.each([
    ["mataf", "mataf"],
    ["maqam", "maqam"],
    ["masa", "masa"],
    ["haram", "masjid-al-haram"],
    ["makkah", "makkah"],
    ["jamarat", "jamarat"],
    ["mina", "mina"],
    ["muzdalifah", "muzdalifah"],
    ["arafah", "arafah"],
    ["namirah", "arafah"],
    ["abyarAli", "dhul-hulayfah"],
  ] as const)("places %s in %s", (point, region) => {
    expect(regionAt(POINTS[point])).toBe(region);
  });

  it("prefers the most specific place", () => {
    // The Mataf is inside Masjid al-Haram and Makkah; the Jamarat are inside Mina.
    const regions = GEO_REGIONS.filter((r) => contains(r.shape, POINTS.mataf)).map((r) => r.id);
    expect(regions).toEqual(expect.arrayContaining(["mataf", "masjid-al-haram", "makkah"]));
    expect(regionAt(POINTS.mataf)).toBe("mataf");
    expect(GEO_REGIONS.filter((r) => contains(r.shape, POINTS.jamarat)).map((r) => r.id)).toContain("mina");
    expect(regionAt(POINTS.jamarat)).toBe("jamarat");
  });

  it("is outside away from Makkah and the holy sites", () => {
    expect(regionAt(POINTS.jeddah)).toBe("outside");
  });

  it("is uncertain when the accuracy is too poor: 50 m at Masjid al-Haram, 300 m elsewhere", () => {
    expect(regionAt(POINTS.mataf, 50)).toBe("mataf");
    expect(regionAt(POINTS.mataf, 51)).toBe("uncertain");
    expect(regionAt(POINTS.masa, 80)).toBe("uncertain");
    expect(regionAt(POINTS.arafah, 250)).toBe("arafah");
    expect(regionAt(POINTS.arafah, 301)).toBe("uncertain");
    // A poor fix cannot prove the pilgrim is outside either.
    expect(regionAt(POINTS.jeddah, 1000)).toBe("uncertain");
  });

  it("is uncertain for a broken fix", () => {
    expect(detectPlace({ latitude: Number.NaN, longitude: 39.8, accuracy: 5 }).status).toBe("uncertain");
    expect(detectPlace({ latitude: 21.42, longitude: 39.82, accuracy: Number.POSITIVE_INFINITY }).status).toBe("uncertain");
  });
});

describe("geodata (approximate, pending verification)", () => {
  it("is marked approximate and draft, with OpenStreetMap attribution", () => {
    expect(GEO_META.status).toBe("draft");
    expect(GEO_META.source.join(" ")).toMatch(/OpenStreetMap \(ODbL\), approximate, pending verification/);
    expect(GEO_ATTRIBUTION).toBe("© OpenStreetMap contributors");
  });

  it("has unique ids, known places, and boundary wording for Mina, Muzdalifah, Arafah and the miqats", () => {
    expect(new Set(GEO_REGIONS.map((r) => r.id)).size).toBe(GEO_REGIONS.length);
    for (const r of GEO_REGIONS) {
      expect(PLACES).toContain(r.place);
      for (const p of r.matches) expect(PLACES).toContain(p);
      expect(r.boundary).toBe(["mina", "muzdalifah", "arafah", "miqat"].includes(r.kind));
    }
    expect(new Set(GEO_REGIONS.filter((r) => r.kind === "miqat").map((r) => r.miqat))).toEqual(
      new Set(["dhul-hulayfah", "juhfah", "rabigh", "qarn", "yalamlam", "dhat-irq"]),
    );
  });

  it("never lets two places of the same specificity overlap at their corners", () => {
    for (const a of GEO_REGIONS) {
      if (a.shape.kind !== "polygon") continue;
      for (const b of GEO_REGIONS) {
        if (a === b || b.level !== a.level) continue;
        for (const corner of a.shape.points) expect(contains(b.shape, corner), `${a.id} corner in ${b.id}`).toBe(false);
      }
    }
  });
});
