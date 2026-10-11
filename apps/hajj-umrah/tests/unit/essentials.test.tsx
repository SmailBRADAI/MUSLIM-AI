// T035, T060, T061, T062: Duas screen, lap counter, emergency card, large text.
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { closeDbForTests, getSetting } from "../../src/data/db";
import { lapKindOf } from "../../src/data/laps";
import { I18nProvider } from "../../src/i18n";
import { LapCounter } from "../../src/components/LapCounter";
import { SettingsPanel } from "../../src/components/SettingsPanel";
import { Duas } from "../../src/screens/Duas";
import { Emergency } from "../../src/screens/Emergency";

const wrap = (ui: React.ReactElement) => render(<I18nProvider language="en">{ui}</I18nProvider>);

beforeEach(async () => {
  await closeDbForTests();
  indexedDB.deleteDatabase("rafiq");
  document.documentElement.classList.remove("large-text");
});

describe("lapKindOf", () => {
  it("counts Tawaf and Sa'i steps but not the prayer after Tawaf", () => {
    expect(lapKindOf("umrah.tawaf")).toBe("tawaf");
    expect(lapKindOf("hajj-tamattu.umrah-tawaf")).toBe("tawaf");
    expect(lapKindOf("hajj-qiran.tawaf-ifadah")).toBe("tawaf");
    expect(lapKindOf("umrah.sai")).toBe("sai");
    expect(lapKindOf("hajj-tamattu.umrah-sai")).toBe("sai");
    expect(lapKindOf("umrah.tawaf-prayer")).toBeNull();
    expect(lapKindOf("umrah.ihram")).toBeNull();
  });
});

describe("LapCounter", () => {
  it("counts to seven, stops there, undoes, and remembers the count", async () => {
    const view = wrap(<LapCounter stepId="umrah.tawaf" kind="tawaf" />);
    const add = screen.getByRole("button", { name: "Count a lap" });
    for (let i = 0; i < 7; i++) await userEvent.click(add);
    expect(screen.getByRole("status").textContent).toContain("7 of 7");
    expect(screen.getByRole("status").textContent).toContain("Seven completed");
    expect((add as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("status").textContent).toContain("6 of 7");
    await waitFor(async () => expect(await getSetting("laps:umrah.tawaf")).toBe(6));
    view.unmount();
    wrap(<LapCounter stepId="umrah.tawaf" kind="tawaf" />);
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("6 of 7"));
    await userEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(screen.getByRole("status").textContent).toContain("0 of 7");
  });
});

describe("Duas", () => {
  it("lists every supplication with its source and review badge", () => {
    wrap(<Duas />);
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(15);
    expect(within(items[0]).getByText(/Source/)).toBeTruthy();
  });
});

describe("Emergency", () => {
  it("saves the card on the device and shows phone numbers as call links", async () => {
    const view = wrap(<Emergency />);
    await userEvent.type(screen.getByLabelText("Your name"), "Ali");
    await userEvent.type(screen.getByLabelText("Group leader phone"), "+33 6 12 34 56 78");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Ali")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Call: .*\+33 6 12 34 56 78/ }).getAttribute("href")).toBe("tel:+33612345678");
    view.unmount();
    wrap(<Emergency />);
    await waitFor(() => expect(screen.getByText("Ali")).toBeTruthy());
    expect(screen.getByRole("link", { name: "Call: Ambulance (Red Crescent) 997" }).getAttribute("href")).toBe("tel:997");
    expect(screen.getByText(/Pending verification/)).toBeTruthy();
  });
});

describe("Large text", () => {
  it("is a switch in settings that marks the page and is remembered", async () => {
    wrap(<SettingsPanel open onClose={() => undefined} journey="umrah" onLanguageChange={() => undefined} onChangeJourney={() => undefined} onPackInstalled={() => undefined} onGuideSlot={() => undefined} showGuideSection={false} />);
    await userEvent.click(screen.getByRole("switch", { name: "Large text" }));
    expect(document.documentElement.classList.contains("large-text")).toBe(true);
    await waitFor(async () => expect(await getSetting("largeText")).toBe(true));
  });
});
