// T049: the original teaching illustrations (miqat map, ihram clothing and rules, Tawaf route, Sa'i track).
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import arTexts from "../../content/i18n/ar/umrah.json";
import enTexts from "../../content/i18n/en/umrah.json";
import urTexts from "../../content/i18n/ur/umrah.json";
import umrah from "../../content/journeys/umrah.json";
import { SaiDiagram, TawafDiagram } from "../../src/components/Diagrams";
import { DiagramView, IhramDress, IhramRules, MiqatMap } from "../../src/components/Illustrations";
import { DIAGRAM_ITEMS, diagramsOf, IHRAM_RULES, MIQATS } from "../../src/data/diagrams";
import { orderedSteps } from "../../src/data/progress";
import type { Journey } from "../../src/data/types";
import { I18nProvider, strings } from "../../src/i18n";

const LANGS = { ar: arTexts, en: enTexts, ur: urTexts } as const;
type Lang = keyof typeof LANGS;
const itemsOf = (lang: Lang, id: string) => (LANGS[lang] as unknown as Record<string, { diagramItems?: Record<string, string>; diagramLabel?: string }>)[id];
const inLang = (lang: Lang, ui: React.ReactNode) =>
  render(
    <I18nProvider language={lang}>
      <div dir={lang === "en" ? "ltr" : "rtl"}>{ui}</div>
    </I18nProvider>,
  );

describe.each(["ar", "en", "ur"] as const)("illustrations in %s", (lang) => {
  const ihram = itemsOf(lang, "umrah.ihram");
  const rules = itemsOf(lang, "umrah.ihram-rules");

  it("draws the miqat map left-to-right with the five miqats and who they are for, all from the reviewed text", () => {
    const { container } = inLang(lang, <MiqatMap caption={ihram.diagramLabel!} items={ihram.diagramItems} />);
    const drawing = container.querySelector(".miqat-map")!;
    expect(drawing).toHaveAttribute("dir", "ltr");
    expect(drawing).toHaveAccessibleName(ihram.diagramLabel!);
    expect(drawing.querySelectorAll(".miqat-point")).toHaveLength(5);
    expect(drawing.querySelector(".miqat-makkah")?.textContent).toBe(strings[lang].places.makkah.name);
    const legend = screen.getAllByRole("listitem");
    expect(legend).toHaveLength(5);
    for (const n of MIQATS) {
      expect(legend[n - 1]).toHaveTextContent(ihram.diagramItems![`miqat.${n}.name`]);
      expect(legend[n - 1]).toHaveTextContent(ihram.diagramItems![`miqat.${n}.for`]);
    }
    expect(screen.getByText(ihram.diagramLabel!)).toBeVisible();
  });

  it("shows the men's and women's dress with one accessible name for the three drawings", () => {
    const items = ihram.diagramItems!;
    const { container } = inLang(lang, <IhramDress caption={items["ihram-dress.caption"]} items={items} />);
    const grid = container.querySelector(".dress-grid")!;
    expect(grid).toHaveAccessibleName([items["ihram-dress.man"], items["ihram-dress.tawaf"], items["ihram-dress.woman"]].join(" "));
    // Idtiba': the right shoulder is the bare one; no face is drawn on any figure.
    expect(container.querySelector("[data-bare='right']")).toBeInTheDocument();
    expect(container.querySelectorAll("ellipse, circle.dress-head").length).toBeGreaterThan(0);
    expect(container.querySelector("text")).toBeNull();
    for (const art of container.querySelectorAll(".dress-art")) expect(art).toHaveAttribute("dir", "ltr");
    expect(screen.getByText(items["ihram-dress.caption"])).toBeVisible();
  });

  it("lists every prohibition with a cross mark and every permitted thing with a tick, labelled by heading", () => {
    const { container } = inLang(lang, <IhramRules caption={rules.diagramLabel!} items={rules.diagramItems} />);
    const items = rules.diagramItems!;
    const groups = IHRAM_RULES.groups.flatMap((g) => g.items);
    expect(container.querySelectorAll(".rules-grid li")).toHaveLength(groups.length);
    for (const li of container.querySelectorAll(".rules-grid li")) expect(li.querySelector(".glyph-no")).not.toBeNull();
    for (const key of groups) expect(screen.getByText(items[`ihram-rules.${key}`])).toBeVisible();
    for (const g of IHRAM_RULES.groups) expect(screen.getByRole("region", { name: items[`ihram-rules.${g.heading}`] })).toBeInTheDocument();
    expect(within(container.querySelector(".rules-list") as HTMLElement).getAllByRole("listitem")).toHaveLength(IHRAM_RULES.permitted.length);
    expect(screen.getByText(items["ihram-rules.prohibited"])).toBeVisible();
    expect(screen.getByText(items["ihram-rules.permitted"])).toBeVisible();
  });

  it("keeps the Tawaf route counter-clockwise with the Hijr, and says which path is valid", () => {
    const tawaf = itemsOf(lang, "umrah.tawaf");
    const { container } = inLang(lang, <TawafDiagram label={tawaf.diagramLabel!} items={tawaf.diagramItems} />);
    const drawing = container.querySelector(".kaaba-diagram")!;
    expect(drawing).toHaveAttribute("dir", "ltr");
    expect(drawing).toHaveAttribute("data-direction", "counterclockwise");
    expect(drawing).toHaveAccessibleName(tawaf.diagramLabel!);
    // Four arcs, each ending in an arrow; they run east to north to west to south and back (sweep flag 0 is counter-clockwise).
    const arcs = [...drawing.querySelectorAll(".tawaf-valid")];
    expect(arcs).toHaveLength(4);
    for (const arc of arcs) expect(arc.getAttribute("d")).toMatch(/ 0 0 0 /);
    expect(drawing.querySelector(".tawaf-hijr")).toBeInTheDocument();
    expect(drawing.querySelector(".tawaf-invalid")).toBeInTheDocument();
    const names = [strings[lang].diagrams.blackStone, strings[lang].diagrams.yemeniCorner, strings[lang].diagrams.hijr];
    for (const name of names) expect(screen.getByText(name)).toBeVisible();
    expect(screen.getByText(tawaf.diagramItems!["tawaf.valid"])).toBeVisible();
    expect(screen.getByText(tawaf.diagramItems!["tawaf.invalid"])).toBeVisible();
  });

  it("marks the green markers and the zone where men run on the Sa'i track", () => {
    const sai = itemsOf(lang, "umrah.sai");
    const { container } = inLang(lang, <SaiDiagram label={sai.diagramLabel!} items={sai.diagramItems} />);
    const drawing = container.querySelector(".sai-diagram")!;
    expect(drawing).toHaveAttribute("dir", "ltr");
    expect(drawing).toHaveAccessibleName(sai.diagramLabel!);
    const posts = [...drawing.querySelectorAll(".sai-post")].map((p) => Number(p.getAttribute("x1")));
    expect(posts).toEqual([120, 180]);
    for (const run of drawing.querySelectorAll(".sai-run")) {
      expect([run.getAttribute("x1"), run.getAttribute("x2")]).toEqual(["120", "180"]);
    }
    expect(screen.getByText(sai.diagramItems!["sai.menRun"])).toBeVisible();
    expect(screen.getByText(sai.diagramItems!["sai.womenWalk"])).toBeVisible();
  });
});

describe("illustrations in the Umrah content", () => {
  const steps = orderedSteps(umrah as Journey);

  it("puts the miqat map and the dress on Ihram, the rules on their own step, Tawaf and Sa'i keep theirs", () => {
    const by = Object.fromEntries(steps.map((s) => [s.id, diagramsOf(s)]));
    expect(by["umrah.ihram"]).toEqual(["miqat", "ihram-dress"]);
    expect(by["umrah.ihram-rules"]).toEqual(["ihram-rules"]);
    expect(by["umrah.tawaf"]).toEqual(["tawaf"]);
    expect(by["umrah.sai"]).toEqual(["sai"]);
    expect(by["umrah.tawaf-prayer"]).toEqual([]);
  });

  it("cites the booklet and keeps each step's version in line with the journey", () => {
    // Status and version move with content review (T052), so they are not pinned here.
    for (const step of steps) {
      expect(step.meta.version).toMatch(/^0\.3\.\d+$/);
      expect(step.meta.source.some((s) => s.includes("صفة العمرة المصورة"))).toBe(true);
    }
    const rules = steps.find((s) => s.id === "umrah.ihram-rules")!;
    expect(rules.ruling).toBe("wajib");
    expect(rules.place).toBe("miqat");
  });

  it.each(["ar", "en", "ur"] as const)("states the five miqats and who each is for in %s", (lang) => {
    const items = itemsOf(lang, "umrah.ihram").diagramItems!;
    const details = (LANGS[lang] as unknown as Record<string, { details: string }>)["umrah.ihram"].details;
    for (const n of MIQATS) {
      expect(items[`miqat.${n}.name`]).toBeTruthy();
      expect(details).toContain(items[`miqat.${n}.name`]);
    }
  });

  it("has a label for every key each illustration needs", () => {
    for (const lang of ["ar", "en", "ur"] as const) {
      for (const [id, diagram] of [["umrah.ihram", "miqat"], ["umrah.ihram", "ihram-dress"], ["umrah.ihram-rules", "ihram-rules"]] as const) {
        const items = itemsOf(lang, id).diagramItems!;
        for (const key of DIAGRAM_ITEMS[diagram]) expect(items[key], `${lang} ${key}`).toBeTruthy();
      }
    }
  });

  it("renders any listed diagram and nothing for an unknown id", () => {
    const items = itemsOf("en", "umrah.ihram").diagramItems!;
    const { container } = inLang("en", <DiagramView diagram="miqat" caption="c" items={items} />);
    expect(container.querySelector(".miqat-figure")).toBeInTheDocument();
    expect(diagramsOf({ diagram: ["tawaf", "mosque"] as never })).toEqual(["tawaf"]);
    expect(diagramsOf({})).toEqual([]);
  });
});
