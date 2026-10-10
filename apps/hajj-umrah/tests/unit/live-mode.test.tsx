// T048: the Live mode card in the Guide, with a mocked navigator.geolocation.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { LiveMode, SETTLE_MS } from "../../src/components/LiveMode";
import { journeyContent } from "../../src/data/content";
import type { LatLon } from "../../src/data/places-geo";
import type { JourneyType } from "../../src/data/types";
import { I18nProvider, strings } from "../../src/i18n";
import type { Language } from "../../src/i18n";
import { Guide } from "../../src/screens/Guide";
import { POINTS } from "./geo-points";

type Success = (p: { coords: { latitude: number; longitude: number; accuracy: number }; timestamp: number }) => void;
type Failure = (e: { code: number; message: string }) => void;

function mockGeolocation() {
  let success: Success | undefined;
  let failure: Failure | undefined;
  let next = 1;
  const watchPosition = vi.fn((s: Success, f: Failure) => {
    success = s;
    failure = f;
    return next++;
  });
  const clearWatch = vi.fn();
  Object.defineProperty(navigator, "geolocation", { value: { watchPosition, clearWatch, getCurrentPosition: vi.fn() }, configurable: true });
  return {
    watchPosition,
    clearWatch,
    fix: ([latitude, longitude]: LatLon, accuracy = 10) =>
      act(() => success?.({ coords: { latitude, longitude, accuracy }, timestamp: Date.now() })),
    fail: (code: 1 | 2 | 3) => act(() => failure?.({ code, message: "" })),
  };
}

function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

afterEach(() => {
  // jsdom has no geolocation; remove the mock so each test starts the same.
  delete (navigator as { geolocation?: unknown }).geolocation;
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  vi.useRealTimers();
});

/** The Guide as the app shows it, with Live mode state held above it as in App. */
function GuideWithLive({ type, completed, onStepDone }: { type: JourneyType; completed: string[]; onStepDone: () => Promise<void> }) {
  const [live, setLive] = useState(false);
  const content = journeyContent(type, "en")!;
  return <Guide journey={content.journey} texts={content.texts} completed={completed} onStepDone={onStepDone} saveFailed={false} live={live} onLiveChange={setLive} />;
}

function renderGuide(type: JourneyType = "umrah", completed: string[] = ["umrah.ihram"], onStepDone = vi.fn(async () => undefined)) {
  const view = render(
    <I18nProvider language="en">
      <GuideWithLive type={type} completed={completed} onStepDone={onStepDone} />
    </I18nProvider>,
  );
  return { ...view, onStepDone };
}

/** Visible text only: the live region repeats the card's message for screen readers. */
const VISIBLE = { ignore: "script, style, .visually-hidden" };
const shown = (text: string) => screen.getByText(text, VISIBLE);
const liveSwitch = () => screen.getByRole("switch", { name: "Live mode" });
const status = () => screen.getAllByRole("status").find((el) => el.closest(".live-card"))!;

describe("Live mode (T048)", () => {
  it("is off by default and asks for nothing until turned on", () => {
    const geo = mockGeolocation();
    renderGuide();
    expect(liveSwitch()).toHaveAttribute("aria-checked", "false");
    expect(liveSwitch()).toHaveAccessibleDescription(strings.en.live.privacy);
    expect(geo.watchPosition).not.toHaveBeenCalled();
  });

  it("in the Mataf, suggests Tawaf and opens it, without marking anything done", async () => {
    const geo = mockGeolocation();
    const { onStepDone } = renderGuide("umrah", []);
    // The Guide opens on Ihram, the first step not done.
    expect(screen.getByRole("heading", { level: 1, name: "Ihram" })).toBeInTheDocument();
    await userEvent.click(liveSwitch());
    expect(liveSwitch()).toHaveAttribute("aria-checked", "true");
    expect(geo.watchPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), expect.objectContaining({ enableHighAccuracy: true }));
    expect(shown(strings.en.live.finding)).toBeInTheDocument();

    geo.fix(POINTS.mataf);
    const card = screen.getByRole("region", { name: "Live mode" });
    expect(card.querySelector("figcaption")).toHaveTextContent("You seem to be in the Mataf");
    expect(card.querySelector(".place-part.here")).toHaveAttribute("data-part", "mataf");
    expect(card).toHaveTextContent("Suggested stepTawaf");
    expect(card).not.toHaveTextContent(strings.en.live.checkSigns);
    expect(status()).toHaveTextContent("You seem to be in the Mataf. Suggested step: Tawaf");

    await userEvent.click(screen.getByRole("button", { name: "Go to this step" }));
    expect(screen.getByRole("heading", { level: 1, name: "Tawaf" })).toHaveFocus();
    expect(shown(strings.en.live.openNow)).toBeInTheDocument();
    expect(onStepDone).not.toHaveBeenCalled();
  });

  it("says the location is uncertain when the accuracy is poor", async () => {
    const geo = mockGeolocation();
    renderGuide();
    await userEvent.click(liveSwitch());
    geo.fix(POINTS.mataf, 120);
    expect(shown(strings.en.live.uncertain)).toBeInTheDocument();
    expect(screen.queryByText(/You seem to be/)).not.toBeInTheDocument();
  });

  it("outside the holy sites, says where live mode works", async () => {
    const geo = mockGeolocation();
    renderGuide();
    await userEvent.click(liveSwitch());
    geo.fix(POINTS.jeddah);
    expect(shown(strings.en.live.outside)).toBeInTheDocument();
  });

  it("says gently when no remaining step is performed here", async () => {
    const geo = mockGeolocation();
    renderGuide();
    await userEvent.click(liveSwitch());
    geo.fix(POINTS.arafah);
    expect(shown(strings.en.live.noStep)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to this step" })).not.toBeInTheDocument();
  });

  it("when permission is denied, stops watching, explains, and turns off with focus on the switch", async () => {
    const geo = mockGeolocation();
    renderGuide();
    await userEvent.click(liveSwitch());
    geo.fail(1);
    expect(shown(strings.en.live.errors.denied)).toBeInTheDocument();
    expect(geo.clearWatch).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole("button", { name: "Turn off live mode" }));
    expect(liveSwitch()).toHaveAttribute("aria-checked", "false");
    expect(liveSwitch()).toHaveFocus();
  });

  it.each([
    [2, "unavailable"],
    [3, "timeout"],
  ] as const)("explains error %i (%s) and offers to turn off", async (code, key) => {
    const geo = mockGeolocation();
    renderGuide();
    await userEvent.click(liveSwitch());
    geo.fail(code);
    expect(shown(strings.en.live.errors[key])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn off live mode" })).toBeInTheDocument();
    // The watch keeps trying; a later position replaces the message.
    geo.fix(POINTS.mataf);
    expect(screen.queryByText(strings.en.live.errors[key], VISIBLE)).not.toBeInTheDocument();
  });

  it("keeps a recent position through a passing timeout", async () => {
    const geo = mockGeolocation();
    renderGuide();
    await userEvent.click(liveSwitch());
    geo.fix(POINTS.mataf);
    geo.fail(3);
    expect(screen.getByText("You seem to be in the Mataf")).toBeInTheDocument();
  });

  it("says so when the browser has no location support", async () => {
    renderGuide();
    await userEvent.click(liveSwitch());
    expect(shown(strings.en.live.errors.unsupported)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn off live mode" })).toBeInTheDocument();
  });

  it("stops watching when turned off, when the app is hidden, and when the Guide is left", async () => {
    const geo = mockGeolocation();
    const view = renderGuide();
    await userEvent.click(liveSwitch());
    await userEvent.click(liveSwitch());
    expect(geo.clearWatch).toHaveBeenLastCalledWith(1);

    await userEvent.click(liveSwitch());
    setVisibility("hidden");
    expect(geo.clearWatch).toHaveBeenLastCalledWith(2);
    setVisibility("visible");
    expect(geo.watchPosition).toHaveBeenCalledTimes(3);

    view.unmount();
    expect(geo.clearWatch).toHaveBeenLastCalledWith(3);
  });

  it("changes place, and announces it, only once the new place has held", async () => {
    vi.useFakeTimers();
    const geo = mockGeolocation();
    renderGuide();
    fireEvent.click(liveSwitch());
    geo.fix(POINTS.mataf);
    expect(status()).toHaveTextContent("You seem to be in the Mataf");
    const before = document.activeElement;

    geo.fix(POINTS.masa);
    act(() => vi.advanceTimersByTime(SETTLE_MS - 500));
    // A brief jump back resets the wait.
    geo.fix(POINTS.mataf);
    geo.fix(POINTS.masa);
    act(() => vi.advanceTimersByTime(SETTLE_MS - 500));
    expect(status()).toHaveTextContent("You seem to be in the Mataf");
    act(() => vi.advanceTimersByTime(500));
    expect(status()).toHaveTextContent("You seem to be in the Mas'a, between Safa and Marwah. Suggested step: Sa'i between Safa and Marwah");
    expect(document.activeElement).toBe(before);
  });
});

describe("Live mode wording near boundaries (T048, constitution I)", () => {
  const renderCard = (language: Language) => {
    const geo = mockGeolocation();
    const content = journeyContent("hajj-tamattu", language)!;
    render(
      <I18nProvider language={language}>
        <LiveMode
          on
          onChange={() => undefined}
          journey={content.journey}
          texts={content.texts}
          completed={[]}
          openStepId="hajj-tamattu.umrah-ihram"
          onGoToStep={() => undefined}
        />
      </I18nProvider>,
    );
    return geo;
  };

  it.each(["ar", "en", "ur"] as const)("near Arafah in %s: seems near, check the official signs, suggests the standing", (language) => {
    const geo = renderCard(language);
    geo.fix(POINTS.arafah);
    const t = strings[language];
    expect(screen.getByText(t.live.regions.arafah)).toBeInTheDocument();
    expect(screen.getByText(t.live.checkSigns)).toBeInTheDocument();
    expect(screen.getByText(journeyContent("hajj-tamattu", language)!.texts["hajj-tamattu.arafah"].title)).toBeInTheDocument();
    // Never the step's "I am at Arafah" caption.
    expect(screen.queryByText(t.places.arafah.here)).not.toBeInTheDocument();
  });

  it("names the miqat and asks to check the signs", () => {
    const geo = renderCard("en");
    geo.fix(POINTS.abyarAli);
    expect(screen.getByText("You seem to be near the miqat of Dhul-Hulayfah (Abyar Ali)")).toBeInTheDocument();
    expect(shown(strings.en.live.checkSigns)).toBeInTheDocument();
  });

  it("uses 'seems' and the boundary signs note for every boundary place in every language", () => {
    for (const language of ["ar", "en", "ur"] as const) {
      const { regions, checkSigns } = strings[language].live;
      for (const kind of ["mina", "muzdalifah", "arafah", "miqat"] as const) {
        expect(regions[kind]).toMatch({ ar: /^يبدو أنك قرب/, en: /^You seem to be near/, ur: /^لگتا ہے آپ .* قریب ہیں$/ }[language]);
      }
      expect(checkSigns.length).toBeGreaterThan(0);
    }
  });
});

describe("Live mode test mode (T057, FR-033)", () => {
  it("is off by default, lets you pick a place without reading the real location, and says it is simulated", async () => {
    const geo = mockGeolocation();
    renderGuide("umrah", []);
    await userEvent.click(liveSwitch());
    expect(geo.watchPosition).toHaveBeenCalledTimes(1);
    const testBox = screen.getByRole("checkbox", { name: "Test mode" });
    expect(testBox).not.toBeChecked();

    await userEvent.click(testBox);
    expect(geo.clearWatch).toHaveBeenCalled();
    expect(shown(strings.en.live.testBanner)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Simulated place" }), screen.getByRole("option", { name: "You seem to be in the Mataf" }));
    const card = screen.getByRole("region", { name: "Live mode" });
    expect(card).toHaveTextContent("Suggested stepTawaf");
    expect(card.querySelector(".place-part.here")).toHaveAttribute("data-part", "mataf");
    expect(status()).toHaveTextContent("You seem to be in the Mataf. Suggested step: Tawaf");
  });

  it("returns to the real location when test mode is turned off", async () => {
    const geo = mockGeolocation();
    renderGuide("umrah", []);
    await userEvent.click(liveSwitch());
    await userEvent.click(screen.getByRole("checkbox", { name: "Test mode" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Test mode" }));
    expect(geo.watchPosition).toHaveBeenCalledTimes(2);
    expect(shown(strings.en.live.finding)).toBeInTheDocument();
  });
});
