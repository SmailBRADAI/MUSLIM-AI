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
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
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

describe("Step list (T023)", () => {
  it("opens any step from the list and allows completing steps out of order", async () => {
    const onStepDone = vi.fn(async () => undefined);
    renderGuide([], onStepDone);
    await userEvent.click(screen.getByRole("button", { name: "2. Two" }));
    expect(screen.getByRole("heading", { level: 1, name: "Two" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "2. Two" })).toHaveAttribute("aria-current", "step");
    await userEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    expect(onStepDone).toHaveBeenCalledWith("t.two", true);
  });

  it("names done steps for screen readers", () => {
    renderGuide(["t.one"], async () => undefined);
    expect(screen.getByRole("button", { name: "1. One (Done)" })).toBeInTheDocument();
  });
});

describe("Hajj day view (T032)", () => {
  const hajj: Journey = {
    id: "hajj-test",
    type: "hajj-tamattu",
    version: "0",
    stages: [
      { id: "h-umrah", order: 1, kind: "umrah", steps: [step("h.one", 1)] },
      { id: "h-day9", order: 3, day: 9, steps: [step("h.three", 3)] },
      { id: "h-day8", order: 2, day: 8, steps: [step("h.two", 2)] },
    ],
  };
  const hajjTexts: StepTexts = { "h.one": text("Umrah ihram"), "h.two": text("Hajj ihram"), "h.three": text("Arafah") };
  const renderHajj = (completed: string[]) =>
    render(
      <I18nProvider language="en">
        <Guide journey={hajj} texts={hajjTexts} completed={completed} onStepDone={async () => undefined} saveFailed={false} />
      </I18nProvider>,
    );

  it("groups the steps by day in order, numbering them across days, and names the open step's day", async () => {
    renderHajj(["h.one"]);
    // The day lists come in stage order, whatever the order in the file.
    const dayLists = screen.getAllByRole("list").filter((l) => l.classList.contains("steps"));
    expect(dayLists.map((l) => l.getAttribute("aria-labelledby"))).toEqual(["stage-h-umrah", "stage-h-day8", "stage-h-day9"]);
    expect(screen.getByRole("list", { name: "Umrah" })).toContainElement(screen.getByRole("button", { name: "1. Umrah ihram (Done)" }));
    expect(screen.getByRole("list", { name: "8 Dhu al-Hijjah" })).toContainElement(screen.getByRole("button", { name: "2. Hajj ihram" }));
    expect(screen.getByRole("list", { name: "9 Dhu al-Hijjah" })).toContainElement(screen.getByRole("button", { name: "3. Arafah" }));
    expect(screen.getByText("8 Dhu al-Hijjah · Day of Tarwiyah")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "3. Arafah" }));
    expect(screen.getByText("9 Dhu al-Hijjah · Day of Arafah")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Arafah" })).toHaveFocus();
    expect(screen.getByRole("heading", { level: 1, name: "Arafah" })).toHaveAccessibleDescription("9 Dhu al-Hijjah · Day of Arafah");
  });

  it("keeps a single step list without day names for the Umrah", () => {
    renderGuide([], async () => undefined);
    expect(screen.getByRole("list", { name: "Steps" })).toBeInTheDocument();
    expect(screen.queryByText(/Dhu al-Hijjah/)).not.toBeInTheDocument();
  });
});

describe("Ruling notes (T033)", () => {
  it("shows other schools' positions in the details, after the step's own ruling", async () => {
    const noted: Journey = { ...journey, stages: [{ id: "s", order: 1, steps: [step("t.one", 1, { rulingNote: "otherSchools" })] }] };
    render(
      <I18nProvider language="en">
        <Guide
          journey={noted}
          texts={{ "t.one": { ...text("One"), otherSchools: "The Hanafi school holds otherwise." } }}
          completed={[]}
          onStepDone={async () => undefined}
          saveFailed={false}
        />
      </I18nProvider>,
    );
    expect(screen.queryByText("The Hanafi school holds otherwise.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Details/ }));
    expect(screen.getByRole("heading", { level: 3, name: "Other schools" })).toBeInTheDocument();
    expect(screen.getByText("The Hanafi school holds otherwise.")).toBeInTheDocument();
  });
});
