import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { formatSize, OfflinePacks } from "../../src/components/OfflinePacks";
import * as packs from "../../src/data/packs";
import type { InstalledPack } from "../../src/data/db";
import type { PackManifestEntry } from "../../src/data/pack-format";
import { I18nProvider } from "../../src/i18n";

const entry = (language: "ar" | "en" | "ur", version = "v2"): PackManifestEntry => ({
  language,
  version,
  url: `packs/${language}/${version}/content.json`,
  bytes: 8500,
  sha256: "x",
  updated: "2026-10-09",
  journeys: [],
});
const installed = (language: "ar" | "en" | "ur", version: string): InstalledPack => ({
  id: language,
  language,
  version,
  url: "u",
  sha256: "x",
  sizeBytes: 8500,
  updated: "2026-10-09",
  installedAt: "2026-10-09T00:00:00Z",
});

function renderPacks(onInstalled = vi.fn()) {
  render(
    <I18nProvider language="en">
      <OfflinePacks onInstalled={onInstalled} />
    </I18nProvider>,
  );
  return onInstalled;
}

describe("OfflinePacks (T027)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(packs, "loadPack").mockResolvedValue({ state: "none" });
    vi.spyOn(packs, "fetchManifest").mockResolvedValue({ format: 1, packs: [entry("ar"), entry("en"), entry("ur")] });
  });

  it("lists each language with its size, current language first, and says audio is not included", async () => {
    renderPacks();
    const rows = await screen.findAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("English");
    expect(rows[0]).toHaveTextContent("8.3 kB");
    expect(screen.getByText("Audio is not included yet.")).toBeInTheDocument();
  });

  it("downloads with progress and reports success", async () => {
    let finish!: () => void;
    vi.spyOn(packs, "downloadPack").mockImplementation(async (e, options) => {
      options?.onProgress?.(0.5);
      await new Promise<void>((resolve) => (finish = resolve));
      return installed(e.language, e.version);
    });
    const onInstalled = renderPacks();
    await userEvent.click((await screen.findAllByRole("button", { name: "Download" }))[0]);
    expect(screen.getByRole("progressbar", { name: /Downloading English/ })).toHaveAttribute("value", "0.5");
    vi.mocked(packs.loadPack).mockImplementation(async (lang) =>
      lang === "en" ? { state: "ready", pack: installed("en", "v2"), content: {} as never } : { state: "none" },
    );
    finish();
    expect(await screen.findByText(/On this device/)).toBeInTheDocument();
    expect(onInstalled).toHaveBeenCalled();
  });

  it("shows an error and a retry button when the download fails", async () => {
    vi.spyOn(packs, "downloadPack").mockRejectedValue(new Error("network"));
    renderPacks();
    await userEvent.click((await screen.findAllByRole("button", { name: "Download" }))[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Download failed");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("offers an update when a newer version exists, and flags a lost pack", async () => {
    vi.mocked(packs.loadPack).mockImplementation(async (lang) =>
      lang === "en"
        ? { state: "ready", pack: installed("en", "v1"), content: {} as never }
        : lang === "ar"
          ? { state: "lost", pack: installed("ar", "v2") }
          : { state: "none" },
    );
    renderPacks();
    expect(await screen.findByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(screen.getByText(/removed from this device/)).toBeInTheDocument();
  });

  it("says downloading needs a connection when offline", async () => {
    vi.mocked(packs.fetchManifest).mockRejectedValue(new TypeError("offline"));
    renderPacks();
    expect(await screen.findByText(/You are offline/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
  });

  it("formats sizes in the reader's language", () => {
    expect(formatSize(2 * 1024 * 1024, "en")).toBe("2 MB");
  });
});
