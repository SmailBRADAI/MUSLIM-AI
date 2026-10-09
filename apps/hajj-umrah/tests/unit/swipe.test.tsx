// T051: swipe recognition and its use in the Guide.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { StepTexts } from "../../src/data/content";
import { decideSwipe, prefersReducedMotion } from "../../src/data/swipe";
import type { Journey, Step } from "../../src/data/types";
import { I18nProvider } from "../../src/i18n";
import type { Language } from "../../src/i18n";
import { Guide } from "../../src/screens/Guide";

describe("decideSwipe", () => {
  it("LTR: toward the left is next, toward the right is previous", () => {
    expect(decideSwipe(-80, 5, false)).toBe("next");
    expect(decideSwipe(80, -5, false)).toBe("previous");
  });
  it("RTL: toward the right is next, toward the left is previous (mirrored)", () => {
    expect(decideSwipe(80, 5, true)).toBe("next");
    expect(decideSwipe(-80, 5, true)).toBe("previous");
  });
  it("needs 60 px", () => {
    expect(decideSwipe(-59, 0, false)).toBeNull();
    expect(decideSwipe(-60, 0, false)).toBe("next");
  });
  it("ignores mostly vertical moves", () => {
    expect(decideSwipe(-80, 80, false)).toBeNull();
    expect(decideSwipe(-90, 61, false)).toBeNull();
    expect(decideSwipe(-90, 60, false)).toBe("next");
  });
});

describe("prefersReducedMotion", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("reads the media query, and is false where matchMedia is missing", () => {
    expect(prefersReducedMotion()).toBe(false);
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
    expect(prefersReducedMotion()).toBe(true);
  });
});

const step = (id: string, order: number): Step => ({
  id,
  order,
  ruling: "wajib",
  place: "mataf",
  supplicationIds: [],
  meta: { source: ["مصدر"], status: "draft", version: "0" },
});
const journey: Journey = {
  id: "test",
  type: "umrah",
  version: "0",
  stages: [{ id: "s", order: 1, steps: [step("a", 1), step("b", 2), step("c", 3)] }],
};
const text = (title: string) => ({ title, instruction: "Do it", details: "More", mistakes: "Avoid", review: { status: "draft" as const } });
const texts: StepTexts = { a: text("One"), b: text("Two"), c: text("Three") };

function renderGuide(language: Language, onStepDone = vi.fn(async () => undefined)) {
  render(
    <I18nProvider language={language}>
      <Guide journey={journey} texts={texts} completed={[]} onStepDone={onStepDone} saveFailed={false} />
    </I18nProvider>,
  );
  return { onStepDone, area: document.querySelector(".swipe-area") as HTMLElement };
}
const touch = (area: HTMLElement, dx: number, dy = 0, target: Element = area) => {
  fireEvent.pointerDown(target, { pointerId: 1, pointerType: "touch", clientX: 200, clientY: 300 });
  fireEvent.pointerUp(target, { pointerId: 1, pointerType: "touch", clientX: 200 + dx, clientY: 300 + dy });
};
const pill = () => document.querySelector(".step-pill")?.textContent;

describe("Guide swipe", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("English: swipe left goes to the next step, right to the previous, and never marks a step done", () => {
    const { area, onStepDone } = renderGuide("en");
    expect(pill()).toBe("1 / 3");
    touch(area, -90);
    expect(pill()).toBe("2 / 3");
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Step 2 of 3: Two");
    touch(area, 90);
    expect(pill()).toBe("1 / 3");
    touch(area, 90); // already first
    expect(pill()).toBe("1 / 3");
    expect(onStepDone).not.toHaveBeenCalled();
  });

  it("Arabic (RTL): swipe right goes to the next step, left to the previous", () => {
    const { area } = renderGuide("ar");
    touch(area, 90);
    expect(pill()).toBe("2 / 3");
    touch(area, -90);
    expect(pill()).toBe("1 / 3");
  });

  it("ignores short, vertical, mouse and selection gestures and sideways scrollers", () => {
    const { area } = renderGuide("en");
    touch(area, -30);
    touch(area, -90, 120);
    fireEvent.pointerDown(area, { pointerId: 1, pointerType: "mouse", clientX: 200, clientY: 300 });
    fireEvent.pointerUp(area, { pointerId: 1, pointerType: "mouse", clientX: 100, clientY: 300 });
    expect(pill()).toBe("1 / 3");

    vi.stubGlobal("getSelection", () => ({ toString: () => "some text" }));
    touch(area, -90);
    expect(pill()).toBe("1 / 3");
    vi.unstubAllGlobals();

    const inner = area.querySelector("h2") as HTMLElement;
    Object.defineProperty(inner, "scrollWidth", { value: 500 });
    Object.defineProperty(inner, "clientWidth", { value: 100 });
    inner.style.overflowX = "auto";
    touch(area, -90, 0, inner);
    expect(pill()).toBe("1 / 3");
  });

  it("does not move focus, and slides unless reduced motion is preferred", () => {
    const { area } = renderGuide("en");
    touch(area, -90);
    expect(area).toHaveClass("slide");
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveFocus();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Two");
  });

  it("does not slide with reduced motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
    const { area } = renderGuide("en");
    touch(area, -90);
    expect(pill()).toBe("2 / 3");
    expect(area).not.toHaveClass("slide");
  });

  it("shows a hint once; a swipe or Got it dismisses it for good", () => {
    const first = renderGuide("en");
    expect(screen.getByText("Swipe the card sideways to change step.")).toBeInTheDocument();
    touch(first.area, -90);
    expect(screen.queryByText("Swipe the card sideways to change step.")).not.toBeInTheDocument();
    expect(localStorage.getItem("rafiq.swipeHint")).toBe("1");
    document.body.innerHTML = "";
    renderGuide("en");
    expect(screen.queryByText("Swipe the card sideways to change step.")).not.toBeInTheDocument();
  });

  it("copes with storage that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderGuide("en");
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByText("Swipe the card sideways to change step.")).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("keeps the buttons working beside the swipe", () => {
    renderGuide("en");
    fireEvent.click(screen.getByRole("button", { name: "2. Two" }));
    expect(pill()).toBe("2 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Previous step" }));
    expect(pill()).toBe("1 / 3");
  });
});
