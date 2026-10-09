// T026: download a language pack, verify it, store it, then record it as installed.
// The one place pack storage is touched, so Capacitor can swap Cache Storage for native files (plan, FR-017).
import type { Language } from "../i18n";
import * as db from "./db";
import type { InstalledPack } from "./db";
import type { PackContent, PackManifest, PackManifestEntry } from "./pack-format";

export interface PackStore {
  put(url: string, body: string): Promise<void>;
  get(url: string): Promise<string | null>;
  delete(url: string): Promise<void>;
}

const CACHE_NAME = "rafiq-packs-v1";

export const cacheStore: PackStore = {
  async put(url, body) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(body, { headers: { "Content-Type": "application/json" } }));
  },
  async get(url) {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    return response ? response.text() : null;
  },
  async delete(url) {
    await (await caches.open(CACHE_NAME)).delete(url);
  },
};

export class PackVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackVerificationError";
  }
}

const baseUrl = () => import.meta.env.BASE_URL ?? "/";

/** Online only. Never cached, so the app always sees the latest versions (FR-009). */
export async function fetchManifest(fetcher: typeof fetch = fetch): Promise<PackManifest> {
  const response = await fetcher(`${baseUrl()}packs/manifest.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`manifest: HTTP ${response.status}`);
  return (await response.json()) as PackManifest;
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchBytes(url: string, total: number, onProgress: (share: number) => void, fetcher: typeof fetch, signal?: AbortSignal) {
  const response = await fetcher(url, { cache: "no-store", signal });
  if (!response.ok || !response.body) throw new Error(`${url}: HTTP ${response.status}`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(received / total, 1));
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export interface DownloadOptions {
  onProgress?: (share: number) => void;
  signal?: AbortSignal;
  attempts?: number;
  store?: PackStore;
  fetcher?: typeof fetch;
}

/**
 * Downloads, verifies (size and SHA-256) and stores a pack, then records it as installed.
 * An interrupted or corrupt download is retried from the start and is never recorded as installed.
 */
export async function downloadPack(entry: PackManifestEntry, options: DownloadOptions = {}): Promise<InstalledPack> {
  const { onProgress = () => undefined, signal, attempts = 3, store = cacheStore, fetcher = fetch } = options;
  const url = `${baseUrl()}${entry.url}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const bytes = await fetchBytes(url, entry.bytes, onProgress, fetcher, signal);
      if (bytes.length !== entry.bytes) throw new PackVerificationError(`expected ${entry.bytes} bytes, got ${bytes.length}`);
      if ((await sha256Hex(bytes)) !== entry.sha256) throw new PackVerificationError("checksum does not match");
      // A cancel after the transfer must still leave nothing installed.
      signal?.throwIfAborted();
      const previous = await db.getInstalledPack(entry.language);
      await store.put(url, new TextDecoder().decode(bytes));
      signal?.throwIfAborted();
      const installed: InstalledPack = {
        id: entry.language,
        language: entry.language,
        version: entry.version,
        url,
        sha256: entry.sha256,
        sizeBytes: entry.bytes,
        updated: entry.updated,
        installedAt: new Date().toISOString(),
      };
      // Recorded last: a pack is never marked installed unless its verified file is stored.
      await db.saveInstalledPack(installed);
      if (previous && previous.url !== url) await store.delete(previous.url).catch(() => undefined);
      await requestPersistentStorage();
      return installed;
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

export interface DownloadJob {
  language: Language;
  promise: Promise<InstalledPack>;
  cancel(): void;
  readonly cancelled: boolean;
  share: number;
  /** Called with progress from 0 to 1; returns an unsubscribe function. */
  subscribe(listener: (share: number) => void): () => void;
}

const inFlight = new Map<Language, DownloadJob>();

/**
 * Starts a download that keeps running when the pilgrim leaves the screen. A second call for the same
 * language returns the running download instead of starting another.
 */
export function startDownload(entry: PackManifestEntry, options: Omit<DownloadOptions, "signal" | "onProgress"> = {}): DownloadJob {
  const running = inFlight.get(entry.language);
  if (running) return running;
  const controller = new AbortController();
  const listeners = new Set<(share: number) => void>();
  const job: DownloadJob = {
    language: entry.language,
    share: 0,
    cancel: () => controller.abort(),
    get cancelled() {
      return controller.signal.aborted;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    promise: downloadPack(entry, {
      ...options,
      signal: controller.signal,
      onProgress: (share) => {
        job.share = share;
        listeners.forEach((listener) => listener(share));
      },
    }).finally(() => inFlight.delete(entry.language)),
  };
  inFlight.set(entry.language, job);
  return job;
}

export function runningDownload(language: Language) {
  return inFlight.get(language) ?? null;
}

export type PackState =
  | { state: "none" }
  /** Recorded as installed, but the stored file is gone (site data cleared): ask to download again. */
  | { state: "lost"; pack: InstalledPack }
  | { state: "ready"; pack: InstalledPack; content: PackContent };

export async function loadPack(language: Language, store: PackStore = cacheStore): Promise<PackState> {
  const pack = await db.getInstalledPack(language);
  if (!pack) return { state: "none" };
  const body = await store.get(pack.url).catch(() => null);
  if (!body) return { state: "lost", pack };
  try {
    return { state: "ready", pack, content: JSON.parse(body) as PackContent };
  } catch {
    return { state: "lost", pack };
  }
}

/** Asks the browser not to evict downloaded packs (iOS Safari may otherwise clear them). */
export async function requestPersistentStorage() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
