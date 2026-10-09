import { describe, expect, it, vi } from "vitest";
import * as db from "../../src/data/db";
import { downloadPack, loadPack, PackVerificationError } from "../../src/data/packs";
import type { PackStore } from "../../src/data/packs";
import type { PackManifestEntry } from "../../src/data/pack-format";

const body = JSON.stringify({ format: 1, language: "en", version: "v1", journeys: [], texts: {} });
const bytes = new TextEncoder().encode(body);

async function sha256(data: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function entry(): Promise<PackManifestEntry> {
  return {
    language: "en",
    version: "v1",
    url: "packs/en/v1/content.json",
    bytes: bytes.length,
    sha256: await sha256(bytes),
    updated: "2026-10-09",
    journeys: [{ id: "umrah", version: "0.1.0" }],
  };
}

function memoryStore(): PackStore & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    files,
    put: async (url, text) => void files.set(url, text),
    get: async (url) => files.get(url) ?? null,
    delete: async (url) => void files.delete(url),
  };
}

// jsdom's Blob has no stream(); build the body stream by hand, in two chunks to exercise progress.
const respond = (data: Uint8Array) => async () =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        const mid = Math.floor(data.length / 2);
        controller.enqueue(data.slice(0, mid));
        controller.enqueue(data.slice(mid));
        controller.close();
      },
    }),
  );

describe("downloadPack (T026)", () => {
  it("stores the verified file, then records the pack as installed", async () => {
    const store = memoryStore();
    const progress: number[] = [];
    const pack = await downloadPack(await entry(), { store, fetcher: respond(bytes) as typeof fetch, onProgress: (p) => progress.push(p) });
    expect(store.files.get(pack.url)).toBe(body);
    expect(await db.getInstalledPack("en")).toMatchObject({ version: "v1", sizeBytes: bytes.length, updated: "2026-10-09" });
    expect(progress.at(-1)).toBe(1);
    expect((await loadPack("en", store)).state).toBe("ready");
  });

  it("never records a truncated download as installed", async () => {
    const store = memoryStore();
    const truncated = respond(bytes.slice(0, 10)) as typeof fetch;
    await expect(downloadPack(await entry(), { store, fetcher: truncated })).rejects.toBeInstanceOf(PackVerificationError);
    expect(await db.getInstalledPack("en")).toBeNull();
    expect(store.files.size).toBe(0);
  });

  it("rejects a file whose checksum does not match", async () => {
    const tampered = new TextEncoder().encode(body.replace("v1", "v2"));
    await expect(downloadPack(await entry(), { store: memoryStore(), fetcher: respond(tampered) as typeof fetch })).rejects.toThrow(
      "checksum",
    );
    expect(await db.getInstalledPack("en")).toBeNull();
  });

  it("retries an interrupted download from the start", async () => {
    const store = memoryStore();
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError("network")).mockImplementation(respond(bytes));
    await downloadPack(await entry(), { store, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect((await loadPack("en", store)).state).toBe("ready");
  });

  it("stops retrying when the pilgrim cancels", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async () => {
      controller.abort();
      throw new DOMException("aborted", "AbortError");
    });
    await expect(downloadPack(await entry(), { store: memoryStore(), fetcher, signal: controller.signal })).rejects.toThrow("aborted");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("loadPack (T026)", () => {
  it("reports no pack before any download", async () => {
    expect((await loadPack("ur", memoryStore())).state).toBe("none");
  });

  it("reports a pack as lost when its stored file was cleared", async () => {
    const store = memoryStore();
    const pack = await downloadPack(await entry(), { store, fetcher: respond(bytes) as typeof fetch });
    await store.delete(pack.url);
    expect(await loadPack("en", store)).toMatchObject({ state: "lost", pack: { version: "v1" } });
  });
});
