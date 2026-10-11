// T060 (FR-036): which steps count laps. Tawaf and sa'i are seven each; the prayer after Tawaf is not counted.
export const LAP_TOTAL = 7;

export type LapKind = "tawaf" | "sai";

export function lapKindOf(stepId: string): LapKind | null {
  const match = /(?:^|\.)(?:umrah-)?(tawaf|sai)(?:-(?:qudum|ifadah|wada))?$/.exec(stepId);
  return match ? (match[1] as LapKind) : null;
}
