import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/app/App";
import * as db from "../../src/data/db";

describe("Onboarding (US2)", () => {
  it("asks for the language first on a fresh install", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "اختر لغتك" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("switches language and direction as soon as one is chosen", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    expect(screen.getByRole("heading", { name: "Choose your language" })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe("ltr");
    await userEvent.click(screen.getByRole("button", { name: "اردو" }));
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ur");
  });

  it("chooses Umrah and lands on Home, remembered on the device", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(screen.getByRole("button", { name: /Umrah/ }));
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(await db.getJourney()).toBe("umrah");
    expect(await db.getLanguage()).toBe("en");
  });

  it("asks the Hajj type and stores it", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(screen.getByRole("button", { name: /Hajj rituals/ }));
    expect(screen.getByRole("heading", { name: "Which type of Hajj?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Hajj Qiran/ }));
    expect(await db.getJourney()).toBe("hajj-qiran");
  });

  it("goes back a step without losing the language", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Choose your language" })).toBeInTheDocument();
  });

  it("skips onboarding once a journey is saved", async () => {
    await db.setJourney("hajj-ifrad");
    render(<App />);
    expect(await screen.findByRole("navigation")).toBeInTheDocument();
  });
});

describe("Settings (T015)", () => {
  async function openSettings() {
    await db.setLanguage("en");
    await db.setJourney("umrah");
    await db.saveProgress({ journeyId: "umrah", completedStepIds: ["umrah.tawaf"], updatedAt: "2026-10-09T00:00:00Z" });
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /Settings/ }));
  }

  it("changes the language without losing progress", async () => {
    await openSettings();
    await userEvent.click(screen.getAllByRole("button", { name: "العربية" }).at(-1)!);
    expect(document.documentElement.dir).toBe("rtl");
    expect((await db.getProgress("umrah")).completedStepIds).toEqual(["umrah.tawaf"]);
  });

  it("changes the journey and keeps the old journey's progress", async () => {
    await openSettings();
    expect(screen.getByText("Umrah")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Change/ }));
    await userEvent.click(screen.getByRole("button", { name: /Hajj rituals/ }));
    await userEvent.click(screen.getByRole("button", { name: /Hajj Tamattu/ }));
    expect(await db.getJourney()).toBe("hajj-tamattu");
    expect((await db.getProgress("umrah")).completedStepIds).toEqual(["umrah.tawaf"]);
    // The Hajj guide isn't written yet: say so instead of showing Umrah steps.
    await userEvent.click(screen.getByRole("button", { name: /My guide/ }));
    expect(screen.getByText(/not available yet/)).toBeInTheDocument();

    // Switching back restores the Umrah progress.
    await userEvent.click(screen.getByRole("button", { name: /Settings/ }));
    await userEvent.click(screen.getByRole("button", { name: /Change/ }));
    await userEvent.click(screen.getByRole("button", { name: /Umrah rituals/ }));
    await userEvent.click(screen.getByRole("button", { name: /My guide/ }));
    // Tawaf was done, so the guide opens on Ihram, the first step not done.
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
  });

  it("says so when the journey choice can't be saved", async () => {
    await openSettings();
    const setJourney = vi.spyOn(db, "setJourney").mockRejectedValue(new Error("quota"));
    await userEvent.click(screen.getByRole("button", { name: /Change/ }));
    await userEvent.click(screen.getByRole("button", { name: /Hajj rituals/ }));
    await userEvent.click(screen.getByRole("button", { name: /Hajj Ifrad/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
    setJourney.mockRestore();
  });

  it("can cancel changing the journey", async () => {
    await openSettings();
    await userEvent.click(screen.getByRole("button", { name: /Change/ }));
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(await db.getJourney()).toBe("umrah");
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
