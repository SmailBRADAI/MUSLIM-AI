import { useCallback, useEffect, useRef, useState } from "react";
import { fetchManifest, loadPack, runningDownload, startDownload } from "../data/packs";
import type { DownloadJob, PackState } from "../data/packs";
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

/**
 * T027: per-language packs with size, progress, cancel and errors. Downloads are online only, and keep
 * running if the pilgrim leaves this screen.
 */
export function OfflinePacks({ onInstalled }: { onInstalled: () => void }) {
  const t = useT();
  const language = useLanguage();
  const [manifest, setManifest] = useState<PackManifestEntry[] | "offline" | null>(null);
  const [states, setStates] = useState<Partial<Record<Language, PackState>>>({});
  const [jobs, setJobs] = useState<Partial<Record<Language, DownloadJob>>>(() =>
    Object.fromEntries(LANGUAGES.flatMap((l) => (runningDownload(l) ? [[l, runningDownload(l)]] : []))),
  );
  const [progress, setProgress] = useState<Partial<Record<Language, number>>>({});
  const [failed, setFailed] = useState<Language | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const refresh = useCallback(async () => {
    const entries = await Promise.all(LANGUAGES.map(async (lang) => [lang, await loadPack(lang).catch((): PackState => ({ state: "none" }))]));
    setStates(Object.fromEntries(entries));
  }, []);

  const checkManifest = useCallback(() => {
    fetchManifest()
      .then((m) => setManifest(m.packs))
      .catch(() => setManifest("offline"));
  }, []);

  useEffect(() => {
    void refresh();
    checkManifest();
    // Coming back online brings the download buttons back without reopening the screen.
    window.addEventListener("online", checkManifest);
    return () => window.removeEventListener("online", checkManifest);
  }, [refresh, checkManifest]);

  // Follow each running download once, including one started before this screen opened.
  const mounted = useRef(true);
  const followed = useRef(new Map<DownloadJob, () => void>());
  useEffect(() => {
    mounted.current = true;
    const subscriptions = followed.current;
    return () => {
      mounted.current = false;
      subscriptions.forEach((unsubscribe) => unsubscribe());
      subscriptions.clear();
    };
  }, []);
  useEffect(() => {
    for (const job of Object.values(jobs)) {
      if (!job || followed.current.has(job)) continue;
      setProgress((p) => ({ ...p, [job.language]: job.share }));
      followed.current.set(job, job.subscribe((share) => mounted.current && setProgress((p) => ({ ...p, [job.language]: share }))));
      job.promise
        .then(async () => {
          if (!mounted.current) return;
          await refresh();
          setAnnouncement(`${languageNames[job.language].name}: ${t.packs.installed}`);
          onInstalled();
        })
        .catch(() => {
          // A cancel is the pilgrim's choice, not an error.
          if (mounted.current && !job.cancelled) setFailed(job.language);
        })
        .finally(() => {
          followed.current.get(job)?.();
          followed.current.delete(job);
          if (mounted.current) setJobs((j) => ({ ...j, [job.language]: undefined }));
        });
    }
  }, [jobs, refresh, onInstalled, t]);

  const start = (entry: PackManifestEntry) => {
    setFailed(null);
    setAnnouncement("");
    setJobs((j) => ({ ...j, [entry.language]: startDownload(entry) }));
  };

  // Current language first: it's the pack the pilgrim needs.
  const ordered = [language, ...LANGUAGES.filter((l) => l !== language)];
  const entryFor = (lang: Language) => (Array.isArray(manifest) ? manifest.find((e) => e.language === lang) : undefined);
  const anyRunning = Object.values(jobs).some(Boolean);

  return (
    <div className="offline-packs">
      {manifest === "offline" && <p className="pack-note" role="status">{t.packs.offline}</p>}
      <p className="visually-hidden" role="status">{announcement}</p>
      <ul className="pack-list">
        {ordered.map((lang) => {
          const state = states[lang];
          const entry = entryFor(lang);
          const installed = state?.state === "ready" ? state.pack : null;
          const upToDate = installed && (!entry || entry.version === installed.version);
          const job = jobs[lang];
          return (
            <li key={lang} className="pack-row">
              <span className="grow">
                <strong lang={lang}>{languageNames[lang].name}</strong>
                <small>
                  {entry ? formatSize(entry.bytes, language) : installed ? formatSize(installed.sizeBytes, language) : ""}
                  {installed && ` · ${upToDate ? t.packs.installed : t.packs.updateAvailable}`}
                </small>
                {state?.state === "lost" && <small className="pack-warning" role="status">{t.packs.lost}</small>}
                {failed === lang && <small className="pack-warning" role="alert">{t.packs.failed}</small>}
              </span>
              {job ? (
                <span className="pack-progress">
                  <progress max={1} value={progress[lang] ?? 0} aria-label={`${t.packs.downloading} ${languageNames[lang].name}`} />
                  <button className="text-link" onClick={job.cancel}>{t.packs.cancel}</button>
                </span>
              ) : upToDate ? (
                <Icon name="check" />
              ) : (
                entry && (
                  <button className="pack-button" onClick={() => start(entry)} disabled={anyRunning}>
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
