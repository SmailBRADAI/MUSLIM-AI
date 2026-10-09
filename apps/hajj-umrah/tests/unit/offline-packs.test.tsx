import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { formatSize, OfflinePacks } from "../../src/components/OfflinePacks";
import * as packs from "../../src/data/packs";
import type { InstalledPack } from "../../src/data/db";
import type { DownloadJob } from "../../src/data/packs";
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

function fakeJob(language: "ar" | "en" | "ur", promise: Promise<InstalledPack>, share = 0): DownloadJob {
  const listeners = new Set<(share: number) => void>();
  let cancelled = false;
  return {
    language,
    promise,
    share,
    get cancelled() {
      return cancelled;
    },
    cancel: () => void (cancelled = true),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

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
    vi.spyOn(packs, "startDownload").mockImplementation((e) =>
      fakeJob(e.language, new Promise((resolve) => (finish = () => resolve(installed(e.language, e.version)))), 0.5),
    );
    const onInstalled = renderPacks();
    await userEvent.click((await screen.findAllByRole("button", { name: "Download" }))[0]);
    expect(screen.getByRole("progressbar", { name: /Downloading English/ })).toHaveAttribute("value", "0.5");
    vi.mocked(packs.loadPack).mockImplementation(async (lang) =>
      lang === "en" ? { state: "ready", pack: installed("en", "v2"), content: {} as never } : { state: "none" },
    );
    finish();
    // Announced to screen readers, and shown on the row.
    expect(await screen.findByText("English: On this device")).toBeInTheDocument();
    expect((await screen.findAllByRole("listitem"))[0]).toHaveTextContent("On this device");
    expect(onInstalled).toHaveBeenCalled();
  });

  it("shows an error and a retry button when the download fails", async () => {
    vi.spyOn(packs, "startDownload").mockImplementation((e) => fakeJob(e.language, Promise.reject(new Error("network"))));
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

  it("does not report an error when the pilgrim cancels", async () => {
    let fail!: (e: Error) => void;
    vi.spyOn(packs, "startDownload").mockImplementation((e) => {
      const job = fakeJob(e.language, new Promise((_, reject) => (fail = reject)));
      const cancel = job.cancel;
      job.cancel = () => {
        cancel();
        fail(new DOMException("aborted", "AbortError"));
      };
      return job;
    });
    renderPacks();
    await userEvent.click((await screen.findAllByRole("button", { name: "Download" }))[0]);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findAllByRole("button", { name: "Download" })).toHaveLength(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a download that is still running when the screen opens again", async () => {
    vi.spyOn(packs, "runningDownload").mockImplementation((lang) =>
      lang === "en" ? fakeJob("en", new Promise(() => undefined), 0.4) : null,
    );
    renderPacks();
    expect(await screen.findByRole("progressbar", { name: /Downloading English/ })).toHaveAttribute("value", "0.4");
  });

  it("formats sizes in the reader's language", () => {
    expect(formatSize(2 * 1024 * 1024, "en")).toBe("2 MB");
  });
});
