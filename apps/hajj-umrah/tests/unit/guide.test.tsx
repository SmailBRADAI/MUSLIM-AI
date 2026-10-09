import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StepTexts } from "../../src/data/content";
import type { Journey, Step } from "../../src/data/types";
import { I18nProvider } from "../../src/i18n";
import { Guide } from "../../src/screens/Guide";

const step = (id: string, order: number, extra: Partial<Step> = {}): Step => ({
  id,
  order,
  ruling: "wajib",
  supplicationIds: [],
  meta: { source: ["مصدر"], status: "draft", version: "0" },
  ...extra,
});
const journey: Journey = {
  id: "test",
  type: "umrah",
  version: "0",
  stages: [
    {
      id: "s",
      order: 1,
      steps: [
        step("t.one", 1, {
          rulingViews: [
            { scholar: "ibn-baz", ruling: "wajib", source: "a" },
            { scholar: "ibn-uthaymeen", ruling: "sunnah", source: "b" },
          ],
        }),
        step("t.two", 2),
      ],
    },
  ],
};
const text = (title: string) => ({ title, instruction: "Do it", details: "More", mistakes: "Avoid", review: { status: "draft" as const } });
const texts: StepTexts = { "t.one": text("One"), "t.two": text("Two") };

function renderGuide(completed: string[], onStepDone: (id: string, done: boolean) => Promise<void>) {
  return render(
    <I18nProvider language="en">
      <Guide journey={journey} texts={texts} completed={completed} onStepDone={onStepDone} saveFailed={false} />
    </I18nProvider>,
  );
}

describe("Guide (T020)", () => {
  it("moves on only after the step is saved, and ignores a second tap while saving", async () => {
    let finish!: () => void;
    const onStepDone = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    renderGuide([], onStepDone);
    const button = screen.getByRole("button", { name: /Mark complete/ });
    await userEvent.click(button);
    await userEvent.click(button);
    expect(onStepDone).toHaveBeenCalledTimes(1);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(button).toBeDisabled();

    await act(async () => finish());
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    // Focus follows the pilgrim to the new step so screen readers announce it.
    expect(screen.getByRole("heading", { level: 1, name: "Two" })).toHaveFocus();
  });

  it("shows both sheikhs' views when they differ", () => {
    renderGuide([], async () => undefined);
    expect(screen.getByText("Ibn Baz: Obligatory")).toBeInTheDocument();
    expect(screen.getByText("Ibn Al-Uthaymeen: Sunnah")).toBeInTheDocument();
  });

  it("ends on the last step with a disabled Done button", () => {
    renderGuide(["t.one", "t.two"], async () => undefined);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Done/ })).toBeDisabled();
    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument();
  });

  it("keeps focus on the page when undo removes its own button", async () => {
    const view = renderGuide(["t.one"], async () => undefined);
    await userEvent.click(screen.getByRole("button", { name: "Previous step" }));
    await userEvent.click(screen.getByRole("button", { name: /haven't finished/ }));
    view.rerender(
      <I18nProvider language="en">
        <Guide journey={journey} texts={texts} completed={[]} onStepDone={async () => undefined} saveFailed={false} />
      </I18nProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "One" })).toHaveFocus();
  });
});
