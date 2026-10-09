import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";
import { isLanguage } from "../i18n";
import type { Language } from "../i18n";

export interface Progress {
  journeyId: string;
  completedStepIds: string[];
  updatedAt: string;
}

export interface InstalledPack {
  id: string;
  language: Language;
  version: string;
  sizeBytes: number;
  installedAt: string;
}

interface RafiqDB extends DBSchema {
  settings: { key: string; value: unknown };
  progress: { key: string; value: Progress };
  packs: { key: string; value: InstalledPack };
}

const DB_NAME = "rafiq";
const DB_VERSION = 1;

// Keys used by the Figma prototype before IndexedDB; migrated once on first open.
const LEGACY_LANGUAGE_KEY = "rafiq-language";
const LEGACY_TAWAF_KEY = "rafiq-tawaf-complete";

let dbPromise: Promise<IDBPDatabase<RafiqDB>> | null = null;

function readLegacy(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function clearLegacy() {
  try {
    localStorage.removeItem(LEGACY_LANGUAGE_KEY);
    localStorage.removeItem(LEGACY_TAWAF_KEY);
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

export function getDb() {
  if (dbPromise) return dbPromise;
  dbPromise = openDB<RafiqDB>(DB_NAME, DB_VERSION, {
    // Let a newer version of the app (another tab) upgrade the database instead of waiting forever.
    blocking() {
      void dbPromise?.then((db) => db.close());
      dbPromise = null;
    },
    upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        db.createObjectStore("settings");
        db.createObjectStore("progress", { keyPath: "journeyId" });
        db.createObjectStore("packs", { keyPath: "id" });

        const language = readLegacy(LEGACY_LANGUAGE_KEY);
        if (isLanguage(language)) void tx.objectStore("settings").put(language, "language");
        if (readLegacy(LEGACY_TAWAF_KEY) === "true") {
          void tx.objectStore("progress").put({
            journeyId: "umrah",
            completedStepIds: ["umrah.tawaf"],
            updatedAt: new Date().toISOString(),
          });
        }
        tx.done.then(clearLegacy, () => undefined);
      }
    },
  });
  // A failed open (storage pressure, aborted upgrade) should not disable storage for the whole session.
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

/** Test helper: forget the open connection so the next call opens a fresh database. */
export async function closeDbForTests() {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

export async function getLanguage(): Promise<Language | null> {
  const value = await (await getDb()).get("settings", "language");
  return isLanguage(value) ? value : null;
}

export async function setLanguage(language: Language) {
  await (await getDb()).put("settings", language, "language");
}

export async function getProgress(journeyId: string): Promise<Progress> {
  const stored = await (await getDb()).get("progress", journeyId);
  return stored ?? { journeyId, completedStepIds: [], updatedAt: new Date(0).toISOString() };
}

export async function saveProgress(progress: Progress) {
  await (await getDb()).put("progress", progress);
}
