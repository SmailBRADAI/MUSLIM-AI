import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { decideSwipe, startsInSideScroller } from "../data/swipe";
import type { SwipeResult } from "../data/swipe";

/**
 * T051: pointer handlers for a swipe-able element (touch and pen only; a mouse drag would fight text
 * selection). Pair with CSS `touch-action: pan-y`, so vertical scrolling stays with the browser.
 */
export function useSwipe(onSwipe: (direction: NonNullable<SwipeResult>) => void, rtl: boolean) {
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const cancelled = useRef(false);
  const latest = useRef({ onSwipe, rtl });
  useEffect(() => {
    latest.current = { onSwipe, rtl };
  });

  return {
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (e.pointerType === "mouse") return;
      if (start.current) {
        // A second finger (pinch) cancels the gesture.
        cancelled.current = true;
        return;
      }
      cancelled.current = startsInSideScroller(e.target, e.currentTarget);
      start.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    },
    onPointerUp(e: ReactPointerEvent<HTMLElement>) {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      start.current = null;
      if (cancelled.current) return;
      // A selection made by long-pressing and dragging text is not a swipe.
      if (typeof getSelection === "function" && getSelection()?.toString()) return;
      const direction = decideSwipe(e.clientX - s.x, e.clientY - s.y, latest.current.rtl);
      if (direction) latest.current.onSwipe(direction);
    },
    onPointerCancel(e: ReactPointerEvent<HTMLElement>) {
      if (start.current?.id === e.pointerId) start.current = null;
    },
  };
}
