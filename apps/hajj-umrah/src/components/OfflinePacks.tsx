import { useEffect, useRef, useState } from "react";
import { downloadPack, fetchManifest, loadPack } from "../data/packs";
import type { PackState } from "../data/packs";
import type { PackManifestEntry } from "../data/pack-format";
import { LANGUAGES, languageNames, useLanguage, useT } from "../i18n";
import type { Language } from "../i18n";
import { Icon } from "./Icon";

/** "8.3 KB" or "1.2 MB" in the reader's language. */
export function formatSize(bytes: number, language: Language) {
  const mb = bytes >= 1024 * 1024;
  return new Intl.NumberFormat(language, {
    style: "unit",
    unit: mb ? "megabyte" : "kilobyte",
    maximumFractionDigits: 1,
  }).format(bytes / (mb ? 1024 * 1024 : 1024));
}

type Download = { language: Language; share: number } | null;

/** T027: per-language packs with size, progress, cancel and errors. Downloads are online only. */
export function OfflinePacks({ onInstalled }: { onInstalled: () => void }) {
  const t = useT();
  const language = useLanguage();
  const [manifest, setManifest] = useState<PackManifestEntry[] | "offline" | null>(null);
  const [states, setStates] = useState<Partial<Record<Language, PackState>>>({});
  const [download, setDownload] = useState<Download>(null);
  const [failed, setFailed] = useState<Language | null>(null);
  const abort = useRef<AbortController | null>(null);

  const refresh = async () => {
    const entries = await Promise.all(LANGUAGES.map(async (lang) => [lang, await loadPack(lang).catch(() => ({ state: "none" }) as const)]));
    setStates(Object.fromEntries(entries));
  };

  useEffect(() => {
    void refresh();
    fetchManifest()
      .then((m) => setManifest(m.packs))
      .catch(() => setManifest("offline"));
    return () => abort.current?.abort();
  }, []);

  const start = async (entry: PackManifestEntry) => {
    abort.current = new AbortController();
    setFailed(null);
    setDownload({ language: entry.language, share: 0 });
    try {
      await downloadPack(entry, {
        signal: abort.current.signal,
        onProgress: (share) => setDownload({ language: entry.language, share }),
      });
      await refresh();
      onInstalled();
    } catch {
      if (!abort.current.signal.aborted) setFailed(entry.language);
    } finally {
      setDownload(null);
    }
  };

  // Current language first: it's the pack the pilgrim needs.
  const ordered = [language, ...LANGUAGES.filter((l) => l !== language)];
  const entryFor = (lang: Language) => (Array.isArray(manifest) ? manifest.find((e) => e.language === lang) : undefined);

  return (
    <div className="offline-packs">
      {manifest === "offline" && <p className="pack-note" role="status">{t.packs.offline}</p>}
      <ul className="pack-list">
        {ordered.map((lang) => {
          const state = states[lang];
          const entry = entryFor(lang);
          const installed = state?.state === "ready" ? state.pack : null;
          const upToDate = installed && (!entry || entry.version === installed.version);
          const busy = download?.language === lang;
          return (
            <li key={lang} className="pack-row">
              <span className="grow">
                <strong lang={lang}>{languageNames[lang].name}</strong>
                <small>
                  {entry ? formatSize(entry.bytes, language) : installed ? formatSize(installed.sizeBytes, language) : ""}
                  {installed && ` · ${upToDate ? t.packs.installed : t.packs.updateAvailable}`}
                </small>
                {state?.state === "lost" && <small className="pack-warning">{t.packs.lost}</small>}
                {failed === lang && <small className="pack-warning" role="alert">{t.packs.failed}</small>}
              </span>
              {busy ? (
                <span className="pack-progress">
                  <progress max={1} value={download.share} aria-label={`${t.packs.downloading} ${languageNames[lang].name}`} />
                  <button className="text-link" onClick={() => abort.current?.abort()}>{t.packs.cancel}</button>
                </span>
              ) : upToDate ? (
                <Icon name="check" />
              ) : (
                entry && (
                  <button className="pack-button" onClick={() => start(entry)} disabled={download !== null}>
                    <Icon name="download" size={18} />
                    {installed ? t.packs.update : failed === lang ? t.packs.retry : t.packs.download}
                  </button>
                )
              )}
            </li>
          );
        })}
      </ul>
      {/* Audio is optional and off by default (FR-008); it arrives with T036. */}
      <p className="pack-note">{t.packs.audioNote}</p>
    </div>
  );
}
