// T048: which step Live mode suggests. It only suggests; it never marks a step done.
import { describe, expect, it } from "vitest";
import { journeyContent } from "../../src/data/content";
import { dhulHijjahDay, suggestStep } from "../../src/data/live";
import { GEO_REGIONS } from "../../src/data/places-geo";
import type { JourneyType } from "../../src/data/types";

const region = (id: string) => GEO_REGIONS.find((r) => r.id === id)!;
const journey = (type: JourneyType) => journeyContent(type, "en")!.journey;
const NOT_DHUL_HIJJAH = new Date("2026-10-09T12:00:00Z"); // 28 Rabi' al-Thani 1448
// Umm al-Qura 1447: 9 Dhu al-Hijjah is 26 May 2026; 10th is the 27th; 11th is the 28th.
const DAY = (d: number) => new Date(Date.UTC(2026, 4, 17 + d, 9));

describe("dhulHijjahDay (Umm al-Qura, Makkah time)", () => {
  it("reads the day in Dhu al-Hijjah and nothing in other months", () => {
    expect(dhulHijjahDay(DAY(9))).toBe(9);
    expect(dhulHijjahDay(DAY(13))).toBe(13);
    expect(dhulHijjahDay(NOT_DHUL_HIJJAH)).toBeNull();
  });

  it("uses Makkah's date, not the device's", () => {
    // 22:30 UTC on 25 May is 01:30 on 26 May in Makkah: the 9th.
    expect(dhulHijjahDay(new Date("2026-05-25T22:30:00Z"))).toBe(9);
  });
});

describe("suggestStep, Umrah", () => {
  const umrah = journey("umrah");

  it("suggests Tawaf in the Mataf, then the two rak'ahs once Tawaf is done", () => {
    expect(suggestStep(umrah, ["umrah.ihram"], region("mataf"))?.id).toBe("umrah.tawaf");
    expect(suggestStep(umrah, ["umrah.ihram", "umrah.tawaf"], region("mataf"))?.id).toBe("umrah.tawaf-prayer");
  });

  it("suggests by journey order, even if earlier steps elsewhere are not done", () => {
    expect(suggestStep(umrah, [], region("masa"))?.id).toBe("umrah.sai");
    expect(suggestStep(umrah, [], region("masjid-al-haram"))?.id).toBe("umrah.tawaf");
  });

  it("suggests Ihram near a miqat and nothing once it is done", () => {
    expect(suggestStep(umrah, [], region("yalamlam"))?.id).toBe("umrah.ihram");
    // The ihram reference step is also performed at the miqat (T049).
    expect(suggestStep(umrah, ["umrah.ihram"], region("yalamlam"))?.id).toBe("umrah.ihram-rules");
    expect(suggestStep(umrah, ["umrah.ihram", "umrah.ihram-rules"], region("yalamlam"))).toBeNull();
  });

  it("has nothing to suggest at Arafah", () => {
    expect(suggestStep(umrah, [], region("arafah"))).toBeNull();
  });

  it("never changes progress", () => {
    const completed = Object.freeze(["umrah.ihram"]);
    suggestStep(umrah, completed, region("mataf"));
    expect(completed).toEqual(["umrah.ihram"]);
  });
});

describe("suggestStep, Hajj", () => {
  const tamattu = journey("hajj-tamattu");
  const umrahDone = ["umrah-ihram", "umrah-tawaf", "umrah-tawaf-prayer", "umrah-sai", "umrah-taqsir"].map((s) => `hajj-tamattu.${s}`);

  it("suggests the Umrah Tawaf of Tamattu' first in the Mataf", () => {
    expect(suggestStep(tamattu, [], region("mataf"), NOT_DHUL_HIJJAH)?.id).toBe("hajj-tamattu.umrah-tawaf");
  });

  it("suggests the step for Arafah at Arafah", () => {
    expect(suggestStep(tamattu, umrahDone, region("arafah"), DAY(9))?.id).toBe("hajj-tamattu.arafah");
  });

  it("prefers today's step: in Mina on the 10th, the 10th's rites rather than the 8th's stay", () => {
    expect(suggestStep(tamattu, umrahDone, region("mina"), NOT_DHUL_HIJJAH)?.id).toBe("hajj-tamattu.mina-tarwiyah");
    // Mina includes the Jamarat, so the 10th starts with the stoning, then the sacrifice.
    expect(suggestStep(tamattu, umrahDone, region("mina"), DAY(10))?.id).toBe("hajj-tamattu.jamrat-aqabah");
    expect(suggestStep(tamattu, [...umrahDone, "hajj-tamattu.jamrat-aqabah"], region("mina"), DAY(10))?.id).toBe("hajj-tamattu.hady");
    expect(suggestStep(tamattu, umrahDone, region("mina"), DAY(11))?.id).toBe("hajj-tamattu.mina-nights");
  });

  it("prefers today's stoning at the Jamarat", () => {
    const upTo10 = [...umrahDone, "hajj-tamattu.jamrat-aqabah"];
    expect(suggestStep(tamattu, upTo10, region("jamarat"), DAY(12))?.id).toBe("hajj-tamattu.jamarat-12");
    // Falls back to journey order when today has no matching step.
    expect(suggestStep(tamattu, upTo10, region("jamarat"), DAY(9))?.id).toBe("hajj-tamattu.jamarat-11");
  });

  it("prefers today's Tawaf in the Mataf on the 10th over the Umrah's", () => {
    expect(suggestStep(tamattu, [], region("mataf"), DAY(10))?.id).toBe("hajj-tamattu.tawaf-ifadah");
  });

  it("ignores the date for the Umrah journey", () => {
    expect(suggestStep(journey("umrah"), ["umrah.ihram"], region("mataf"), DAY(10))?.id).toBe("umrah.tawaf");
  });
});
