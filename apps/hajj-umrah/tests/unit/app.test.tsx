import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/app/App";
import * as db from "../../src/data/db";

describe("App", () => {
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

  it("marks the Tawaf step as a pillar pending scholarly review, never as reviewed", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Umrah rituals/ }));
    expect(screen.getByText("Pillar")).toBeInTheDocument();
    expect(screen.getByText("Pending scholarly review")).toBeInTheDocument();
    expect(screen.queryByText(/Reviewed content/)).not.toBeInTheDocument();
  });

  it("shows the Tawaf arrow counter-clockwise in every language", async () => {
    render(<App />);
    for (const name of ["العربية", "English", "اردو"]) {
      await userEvent.click(await screen.findByRole("button", { name }));
      await userEvent.click(screen.getAllByRole("button", { name: /دليلي|My guide|میری رہنمائی/ })[0]);
      expect(document.querySelector(".direction-arrow")?.textContent).toBe("↺");
    }
  });

  it("saves step completion on the device before moving on, and lets the pilgrim go back", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Umrah rituals/ }));
    await userEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    expect(await screen.findByText("3 / 5")).toBeInTheDocument();
    expect((await db.getProgress("umrah")).completedStepIds).toEqual(["umrah.tawaf"]);
    await userEvent.click(screen.getByRole("button", { name: "Previous step" }));
    expect(await screen.findByText("2 / 5")).toBeInTheDocument();
    expect((await db.getProgress("umrah")).completedStepIds).toEqual([]);
  });

  it("never un-marks a completed step when the pilgrim taps Next", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Umrah rituals/ }));
    await userEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Next: Two rak/ }));
    expect(screen.getByText("3 / 5")).toBeInTheDocument();
    expect((await db.getProgress("umrah")).completedStepIds).toEqual(["umrah.tawaf"]);
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
    getLanguage.mockRestore();
    vi.useRealTimers();
  });
});
