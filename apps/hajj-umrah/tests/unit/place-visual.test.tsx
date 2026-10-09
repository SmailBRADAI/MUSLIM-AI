// T047: the "you are here" visual on each Guide step.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaceVisual } from "../../src/components/PlaceVisual";
import { PLACES } from "../../src/data/types";
import type { Place } from "../../src/data/types";
import { I18nProvider, strings } from "../../src/i18n";
import type { Language } from "../../src/i18n";

const show = (place: Place, language: Language = "en") =>
  render(
    <I18nProvider language={language}>
      <PlaceVisual place={place} />
    </I18nProvider>,
  ).container;

const highlighted = (container: HTMLElement, selector: string) =>
  [...container.querySelectorAll(`${selector}.here`)].map((el) => el.getAttribute("data-stop") ?? el.getAttribute("data-part") ?? el.getAttribute("data-label"));

describe("PlaceVisual", () => {
  it.each([
    ["ar", "أنا في المطاف", "المطاف"],
    ["en", "I am in the Mataf", "Mataf"],
    ["ur", "میں مطاف میں ہوں", "مطاف"],
  ] as const)("captions the Mataf in %s and names it to screen readers", (language, caption, name) => {
    const container = show("mataf", language);
    expect(container.querySelector("figcaption")).toHaveTextContent(caption);
    expect(screen.getByRole("img")).toHaveAccessibleName(strings[language].placeMapLabel.replace("{place}", name));
    // Drawn left to right in every language: geography does not mirror.
    expect(screen.getByRole("img")).toHaveAttribute("dir", "ltr");
  });

  it("highlights the Mataf inside the Haram, and Makkah on the route", () => {
    const container = show("mataf");
    expect(highlighted(container, ".place-stop")).toEqual(["makkah"]);
    expect(highlighted(container, ".place-part")).toEqual(["mataf"]);
    // Not by colour alone: the place's name is marked too, and there is exactly one pin per drawing.
    expect(highlighted(container, ".place-label")).toEqual(["makkah", "mataf"]);
    expect(container.querySelectorAll(".place-pin")).toHaveLength(2);
  });

  it.each([
    ["maqam", "makkah", "maqam"],
    ["masa", "makkah", "masa"],
  ] as const)("highlights %s in the Haram", (place, stop, part) => {
    const container = show(place);
    expect(highlighted(container, ".place-stop")).toEqual([stop]);
    expect(highlighted(container, ".place-part")).toEqual([part]);
  });

  it.each(["miqat", "makkah", "jamarat", "mina", "muzdalifah", "arafah"] as const)("highlights only %s, with no Haram inset", (place) => {
    const container = show(place);
    expect(highlighted(container, ".place-stop")).toEqual([place]);
    expect(highlighted(container, ".place-label")).toEqual([place]);
    expect(container.querySelector(".place-haram")).toBeNull();
    expect(container.querySelectorAll(".place-pin")).toHaveLength(1);
  });

  it("has a name and caption for every place in every language", () => {
    for (const language of ["ar", "en", "ur"] as const) {
      for (const place of PLACES) {
        expect(strings[language].places[place].name.trim()).not.toBe("");
        expect(strings[language].places[place].here).toContain(strings[language].places[place].name);
      }
    }
  });

  it.each([
    ["ar", "أنا في عرفة"],
    ["en", "I am at Arafah"],
    ["ur", "میں عرفات میں ہوں"],
  ] as const)("captions Arafah in %s", (language, caption) => {
    expect(show("arafah", language).querySelector("figcaption")).toHaveTextContent(caption);
  });
});
