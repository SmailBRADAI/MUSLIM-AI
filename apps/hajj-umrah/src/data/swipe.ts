// T051 (FR-025): swipe recognition, pure so it can be tested without a browser.

/** The finger must travel at least this far sideways (CSS px). */
export const SWIPE_MIN_DISTANCE = 60;
/** ...and at least this many times farther sideways than up or down, so a vertical scroll never counts. */
export const SWIPE_DOMINANCE = 1.5;

export type SwipeResult = "next" | "previous" | null;

/**
 * Which step a finger movement asks for. The next step sits toward the end of the reading direction,
 * and a swipe brings it into view by dragging the card the other way:
 * LTR: toward the left (dx < 0) is next. RTL: toward the right (dx > 0) is next.
 */
export function decideSwipe(dx: number, dy: number, rtl: boolean): SwipeResult {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return null;
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE) return null;
  const towardEnd = rtl ? dx > 0 : dx < 0;
  return towardEnd ? "next" : "previous";
}

/** True when the element scrolls sideways, so a swipe that starts in it belongs to it. */
export function scrollsSideways(el: Element): boolean {
  if (el.scrollWidth <= el.clientWidth + 1) return false;
  const overflowX = getComputedStyle(el).overflowX;
  return overflowX === "auto" || overflowX === "scroll";
}

/** True when `target` or one of its ancestors up to (not including) `root` scrolls sideways. */
export function startsInSideScroller(target: EventTarget | null, root: Element): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== root) {
    if (scrollsSideways(el)) return true;
    el = el.parentElement;
  }
  return false;
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
