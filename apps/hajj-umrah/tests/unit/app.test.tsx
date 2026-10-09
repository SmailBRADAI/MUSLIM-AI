import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

describe("App", () => {
  it("starts in Arabic with a right-to-left layout", () => {
    render(<App />);
    expect(screen.getByText("رفيق المناسك")).toBeInTheDocument();
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
  });

  it("switches to English, left-to-right, and remembers the choice", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByText("Rafiq al-Manasik")).toBeInTheDocument();
    expect(document.documentElement.dir).toBe("ltr");
    expect(localStorage.getItem("rafiq-language")).toBe("en");
  });

  it("uses Urdu with a right-to-left layout", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "اردو" }));
    expect(screen.getByText("رفیق المناسک")).toBeInTheDocument();
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("marks the Tawaf step as a pillar pending scholarly review, never as reviewed", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Umrah rituals/ }));
    expect(screen.getByText("Pillar")).toBeInTheDocument();
    expect(screen.getByText("Pending scholarly review")).toBeInTheDocument();
    expect(screen.queryByText(/Reviewed content/)).not.toBeInTheDocument();
  });

  it("shows the Tawaf arrow counter-clockwise in every language", async () => {
    render(<App />);
    for (const name of ["العربية", "English", "اردو"]) {
      await userEvent.click(screen.getByRole("button", { name }));
      await userEvent.click(screen.getAllByRole("button", { name: /دليلي|My guide|میری رہنمائی/ })[0]);
      expect(document.querySelector(".direction-arrow")?.textContent).toBe("↺");
    }
  });

  it("saves step completion on the device and lets the pilgrim go back", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: /Umrah rituals/ }));
    await userEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    expect(localStorage.getItem("rafiq-tawaf-complete")).toBe("true");
    expect(screen.getByText("3 / 5")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Previous step" }));
    expect(localStorage.getItem("rafiq-tawaf-complete")).toBe("false");
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
  });
});
