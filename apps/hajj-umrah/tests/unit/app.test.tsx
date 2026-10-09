import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/app/App";
import * as db from "../../src/data/db";

describe("App", () => {
  // These tests start after onboarding; tests/unit/onboarding.test.tsx covers first launch.
  beforeEach(async () => {
    await db.setJourney("umrah");
  });

  it("starts in Arabic with a right-to-left layout", async () => {
    render(<App />);
    expect(await screen.findByText("رفيق المناسك")).toBeInTheDocument();
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
  });

  it("switches to English, left-to-right, and remembers the choice on the device", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    expect(screen.getByText("Rafiq al-Manasik")).toBeInTheDocument();
    expect(document.documentElement.dir).toBe("ltr");
    expect(await db.getLanguage()).toBe("en");
  });

  it("restores the saved language on the next launch", async () => {
    await db.setLanguage("ur");
    render(<App />);
    expect(await screen.findByText("رفیق المناسک")).toBeInTheDocument();
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("marks draft content as pending scholarly review, never as reviewed", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Umrah rituals/ }));
    expect(screen.getByText("Pillar")).toBeInTheDocument();
    expect(screen.getByText("Pending scholarly review")).toBeInTheDocument();
    expect(screen.queryByText(/Reviewed content/)).not.toBeInTheDocument();
  });

  it("shows the Tawaf arrow counter-clockwise in every language", async () => {
    await db.saveProgress({ journeyId: "umrah", completedStepIds: ["umrah.ihram"], updatedAt: "2026-10-09T00:00:00Z" });
    render(<App />);
    for (const name of ["العربية", "English", "اردو"]) {
      await userEvent.click(await screen.findByRole("button", { name }));
      await userEvent.click(screen.getAllByRole("button", { name: /دليلي|My guide|میری رہنمائی/ })[0]);
      expect(document.querySelector(".direction-arrow")?.textContent).toBe("↺");
    }
  });

  it("opens on the first step not done and walks through the content", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Umrah rituals/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Ihram" })).toBeInTheDocument();
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
    expect(screen.getByText("Next: Tawaf")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Tawaf" })).toBeInTheDocument();
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect((await db.getProgress("umrah")).completedStepIds).toEqual(["umrah.ihram"]);
  });

  it("goes back without un-marking, and undoes only on request", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Umrah rituals/ }));
    await userEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Previous step" }));
    expect(screen.getByRole("heading", { level: 1, name: "Ihram" })).toBeInTheDocument();
    expect((await db.getProgress("umrah")).completedStepIds).toEqual(["umrah.ihram"]);

    // Tapping Next on a done step moves on and never un-marks it.
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Tawaf" })).toBeInTheDocument();
    expect((await db.getProgress("umrah")).completedStepIds).toEqual(["umrah.ihram"]);

    await userEvent.click(screen.getByRole("button", { name: "Previous step" }));
    await userEvent.click(screen.getByRole("button", { name: /haven't finished/ }));
    expect(await screen.findByRole("button", { name: /Mark complete/ })).toBeInTheDocument();
    expect((await db.getProgress("umrah")).completedStepIds).toEqual([]);
  });

  it("shows details, common mistakes, other schools and sources from the content", async () => {
    await db.saveProgress({
      journeyId: "umrah",
      completedStepIds: ["umrah.ihram", "umrah.tawaf", "umrah.tawaf-prayer"],
      updatedAt: "2026-10-09T00:00:00Z",
    });
    await db.setLanguage("en");
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /Umrah rituals/ }));
    expect(screen.getByRole("heading", { level: 1, name: /Sa'i/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Details and common mistakes/ }));
    expect(screen.getByRole("heading", { name: "Common mistakes" })).toBeInTheDocument();
    expect(screen.getByText(/Hanafi school/)).toBeInTheDocument();
    expect(screen.getByText("القرآن الكريم، سورة البقرة 2:158")).toBeInTheDocument();
  });

  it("says progress was not saved when the device write fails", async () => {
    const save = vi.spyOn(db, "saveProgress").mockRejectedValue(new Error("QuotaExceededError"));
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Umrah rituals/ }));
    await userEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
    expect(screen.queryByText(/saved automatically/)).not.toBeInTheDocument();
    save.mockRestore();
  });

  it("starts with defaults instead of a blank screen when storage never answers", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const hang = new Promise<never>(() => undefined);
    const getLanguage = vi.spyOn(db, "getLanguage").mockReturnValue(hang);
    render(<App />);
    await vi.advanceTimersByTimeAsync(1600);
    expect(await screen.findByText("رفيق المناسك")).toBeInTheDocument();
    // A returning pilgrim on a slow device must not be sent back through onboarding.
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "اختر لغتك" })).not.toBeInTheDocument();
    getLanguage.mockRestore();
    vi.useRealTimers();
  });
});
