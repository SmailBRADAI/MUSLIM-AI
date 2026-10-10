// T056: settings side panel and step hero (FR-032).
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/app/App";
import * as db from "../../src/data/db";

async function start() {
  await db.setLanguage("en");
  await db.setJourney("umrah");
  render(<App />);
  return screen.findByRole("button", { name: "Settings" });
}

describe("Settings side panel (FR-032)", () => {
  it("has one settings button in the top bar, no language switcher and no Settings tab", async () => {
    const gear = await start();
    expect(gear.closest("header")).not.toBeNull();
    expect(gear).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector(".language-switcher")).toBeNull();
    expect(screen.getByRole("navigation").textContent).not.toMatch(/Settings/);
  });

  it("opens with language inside, closes with Escape and the close button, and returns focus", async () => {
    const gear = await start();
    await userEvent.click(gear);
    expect(gear).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toContainElement(screen.getByRole("group", { name: "Language" }));
    expect(screen.getByRole("button", { name: "Close settings", hidden: false })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(gear).toHaveAttribute("aria-expanded", "false");
    expect(gear).toHaveFocus();
    await userEvent.click(gear);
    await userEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(gear).toHaveAttribute("aria-expanded", "false");
  });

  it("puts the Guide switches in the panel, not on the step", async () => {
    const gear = await start();
    await userEvent.click(screen.getAllByRole("button", { name: /My guide/ })[0]);
    const panel = document.getElementById("settings-panel")!;
    expect(panel.querySelector(".settings-guide-slot")).toHaveTextContent(/Keep the screen on|screen/i);
    expect(document.querySelector(".page .live-card, .page .wake-switch")).toBeNull();
    await userEvent.click(gear);
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("draws the step picture and the title together", async () => {
    await start();
    await userEvent.click(screen.getAllByRole("button", { name: /My guide/ })[0]);
    const hero = document.querySelector(".step-hero.has-picture")!;
    expect(hero.querySelector("img.step-hero-image")).not.toBeNull();
    expect(hero.querySelector("h1")).toHaveTextContent("Ihram");
  });
});
