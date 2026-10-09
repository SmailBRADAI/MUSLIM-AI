// T048 (FR-022): which step to suggest for where the pilgrim seems to be. It only suggests;
// nothing here marks a step done.
import type { GeoRegion } from "./places-geo";
import { orderedSteps } from "./progress";
import type { Journey, Step } from "./types";

/**
 * Today's day of Dhu al-Hijjah in the Umm al-Qura calendar, at Makkah time, or null in another month
 * or where the calendar isn't supported. The civil date turns at midnight, not at maghrib, and the
 * announced date can differ by a day, so callers use it only as a preference.
 */
export function dhulHijjahDay(date: Date): number | null {
  try {
    const format = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", timeZone: "Asia/Riyadh" });
    if (format.resolvedOptions().calendar !== "islamic-umalqura") return null;
    const parts = format.formatToParts(date);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);
    return month === 12 && Number.isInteger(day) ? day : null;
  } catch {
    return null;
  }
}

/**
 * The first step not done, in journey order, that is performed in the region. For Hajj, a step of
 * today's Dhu al-Hijjah day comes first when there is one. Null when no remaining step is performed there.
 */
export function suggestStep(journey: Journey, completed: readonly string[], region: GeoRegion, today: Date = new Date()): Step | null {
  const done = new Set(completed);
  const dayOf = new Map(journey.stages.flatMap((stage) => stage.steps.map((step) => [step.id, stage.day] as const)));
  const candidates = orderedSteps(journey).filter((step) => !done.has(step.id) && region.matches.includes(step.place));
  if (journey.type !== "umrah") {
    const day = dhulHijjahDay(today);
    const todays = day === null ? undefined : candidates.find((step) => dayOf.get(step.id) === day);
    if (todays) return todays;
  }
  return candidates[0] ?? null;
}
