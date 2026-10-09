// T019: journey progress. Pure helpers plus one save function that writes to the device
// before the caller updates the screen (constitution II).
import * as db from "./db";
import type { Journey, Step } from "./types";

/** Steps in the order the pilgrim performs them: by stage, then by step. */
export function orderedSteps(journey: Journey): Step[] {
  return [...journey.stages]
    .sort((a, b) => a.order - b.order)
    .flatMap((stage) => [...stage.steps].sort((a, b) => a.order - b.order));
}

/** The first step not yet done, or null when the journey is complete. Steps may be done out of order. */
export function currentStep(journey: Journey, completed: readonly string[]): Step | null {
  const done = new Set(completed);
  return orderedSteps(journey).find((step) => !done.has(step.id)) ?? null;
}

/** Share of the journey's steps that are done, 0 to 1. Ids from other journeys are ignored. */
export function completion(journey: Journey, completed: readonly string[]): number {
  const steps = orderedSteps(journey);
  if (steps.length === 0) return 0;
  const done = new Set(completed);
  return steps.filter((step) => done.has(step.id)).length / steps.length;
}

export function withStep(completed: readonly string[], stepId: string, done: boolean): string[] {
  return done ? [...new Set([...completed, stepId])] : completed.filter((id) => id !== stepId);
}

/**
 * Marks a step done or not done and saves it on the device. Resolves with the new list only
 * after the write succeeds; rejects if it fails, so the caller can say progress wasn't saved (FR-018).
 */
export async function setStepDone(journeyId: string, completed: readonly string[], stepId: string, done: boolean) {
  const next = withStep(completed, stepId, done);
  await db.saveProgress({ journeyId, completedStepIds: next, updatedAt: new Date().toISOString() });
  return next;
}
