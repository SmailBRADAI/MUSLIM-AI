// T059: Ask helper (FR-035). Results are existing reviewed content; nothing is generated.
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildDocs, normalize, search, tokens } from "../../src/data/ask";
import type { StepTexts } from "../../src/data/content";
import type { Journey } from "../../src/data/types";
import { I18nProvider } from "../../src/i18n";
import { Ask } from "../../src/screens/Ask";

const journey: Journey = {
  id: "t", type: "umrah", version: "0",
  stages: [{ id: "s", order: 1, steps: [
    { id: "t.ihram", order: 1, ruling: "rukn", place: "miqat", supplicationIds: ["talbiyah"], meta: { source: ["Source A"], status: "approved", reviewer: "r", version: "1" } },
    { id: "t.tawaf", order: 2, ruling: "rukn", place: "mataf", supplicationIds: [], meta: { source: ["Source B"], status: "draft", version: "0" } },
  ] }],
};
const texts: StepTexts = {
  "t.ihram": { title: "Entering ihram", instruction: "Make the intention. Say the talbiyah.", details: "Men wear two white sheets.", mistakes: "Passing the miqat without ihram.", review: { status: "approved", reviewer: "r" } },
  "t.tawaf": { title: "Tawaf", instruction: "Circle the Kaaba seven times.", details: "Start at the Black Stone.", mistakes: "Cutting through the Hijr.", review: { status: "draft" } },
};

function show(onOpenStep: (id: string) => void = () => undefined) {
  return render(
    <I18nProvider language="en">
      <Ask journey={journey} texts={texts} onOpenStep={onOpenStep} />
    </I18nProvider>,
  );
}

describe("search", () => {
  it("unifies Arabic letter variants and drops marks", () => {
    expect(normalize("الإِحْرَام")).toBe(normalize("الاحرام"));
    expect(tokens("What is the talbiyah?")).toEqual(["talbiyah"]);
  });
  it("finds the step that matches and ranks a title match first", () => {
    const docs = buildDocs(journey, texts, "en").filter((d) => d.kind === "step");
    const r = search("how do I do tawaf", docs);
    expect(r[0].doc.id).toBe("t.tawaf");
    expect(r[0].doc.status).toBe("draft");
    expect(search("black stone", docs)[0].excerpt).toBe("Start at the Black Stone.");
  });
  it("returns nothing for words the content does not contain", () => {
    expect(search("bitcoin price", buildDocs(journey, texts, "en"))).toEqual([]);
    expect(search("   ", [])).toEqual([]);
  });
});

describe("Ask screen", () => {
  it("shows the passage with its sources and review badge, and opens the step", async () => {
    const opened: string[] = [];
    show((id) => void opened.push(id));
    await userEvent.type(screen.getByLabelText("Your question"), "white sheets");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    const card = screen.getByRole("heading", { name: "Entering ihram" }).closest("li") as HTMLElement;
    expect(within(card).getByText("Men wear two white sheets.")).toBeTruthy();
    expect(within(card).getByText("Source A")).toBeTruthy();
    await userEvent.click(within(card).getByRole("button", { name: /Open this step/ }));
    expect(opened).toEqual(["t.ihram"]);
  });
  it("says when nothing matches and points to a scholar", async () => {
    show();
    await userEvent.type(screen.getByLabelText("Your question"), "zzzz");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByText(/Nothing in the app's reviewed content matches/)).toBeTruthy();
  });
});
