import type { Screen } from "../app/screens";
import { Icon } from "../components/Icon";
import { formatSize } from "../components/OfflinePacks";
import type { PackState } from "../data/packs";
import { languageNames, useLanguage, useT } from "../i18n";
import type { Language } from "../i18n";

/** The content date in the Hijri (Umm al-Qura) calendar, as pilgrims count days. */
function formatContentDate(date: string, language: Language) {
  try {
    return new Intl.DateTimeFormat(`${language}-u-ca-islamic-umalqura`, { day: "numeric", month: "long", year: "numeric" }).format(
      new Date(`${date}T12:00:00Z`),
    );
  } catch {
    return date;
  }
}

/** Where the pilgrim is in their journey; null while the journey has no content yet. */
export interface JourneyStatus {
  done: boolean;
  /** Title of the first step not done; null when done or when its text is missing. */
  currentTitle: string | null;
  /** 0 to 100. */
  percent: number;
}

export function Home({
  setScreen,
  status,
  pack,
  updateAvailable,
}: {
  setScreen: (s: Screen) => void;
  status: JourneyStatus | null;
  pack: PackState;
  updateAvailable: boolean;
}) {
  const t = useT();
  const language = useLanguage();
  return (
    <main className="page home-page">
      <section className="hero">
        <span className="eyebrow">{t.greeting}</span>
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <span className="hero-kaaba"><Icon name="kaaba" size={42} /></span>
      </section>

      {/* T028: "Ready offline" only when the pack for this language is installed and its file is present. */}
      <button className={pack.state === "ready" ? "offline-card" : "offline-card pending"} onClick={() => setScreen("settings")}>
        <span className="status-icon"><Icon name={pack.state === "ready" ? "shield" : "download"} /></span>
        {pack.state === "ready" ? (
          <span className="grow">
            <strong>{t.offline}</strong>
            <small>
              {languageNames[pack.pack.language].name} · {formatSize(pack.pack.sizeBytes, language)} · {t.packs.updatedOn}{" "}
              {formatContentDate(pack.pack.updated, language)}
            </small>
            {updateAvailable && <small className="update-note">{t.packs.updateAvailable}</small>}
          </span>
        ) : (
          <span className="grow">
            <strong>{t.packs.notDownloaded}</strong>
            <small>{pack.state === "lost" ? t.packs.lost : t.packs.notDownloadedHint}</small>
          </span>
        )}
        {pack.state === "ready" && <span className="offline-check"><Icon name="check" size={17} /></span>}
      </button>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">{t.journey}</span><h2>{t.journeyHint}</h2></div>
          <span className="section-symbol"><Icon name="compass" /></span>
        </div>

        <button className="journey-card primary" onClick={() => setScreen("guide")}>
          <span className="journey-icon"><Icon name="kaaba" size={30} /></span>
          <span className="grow"><strong>{t.umrah}</strong><small>{t.umrahHint}</small></span>
          <span className="round-arrow"><Icon name="arrow" size={19} /></span>
        </button>
        {/* TODO(T031): the Hajj flow is not built yet; this opens the Umrah prototype for now. */}
        <button className="journey-card" onClick={() => setScreen("guide")}>
          <span className="journey-icon light"><Icon name="moon" size={28} /></span>
          <span className="grow"><strong>{t.hajj}</strong><small>{t.hajjHint}</small></span>
          <span className="subtle-arrow"><Icon name="arrow" size={19} /></span>
        </button>
      </section>

      {status && (
        <section className="continue-card">
          <div className="continue-top">
            <span className="mini-kaaba"><Icon name="kaaba" /></span>
            <span className="grow">
              <strong>{t.continue}</strong>
              {status.done ? (
                <small>{t.allStepsDone}</small>
              ) : (
                status.currentTitle && <small>{`${t.currentStep}: ${status.currentTitle}`}</small>
              )}
            </span>
            <span className="progress-number">{status.percent}%</span>
          </div>
          <div className="progress-track"><span style={{ width: `${status.percent}%` }} /></div>
          <button className="text-action" onClick={() => setScreen("guide")}>{t.continue}<Icon name="arrow" size={18} /></button>
        </section>
      )}

      <section className="section-block tools-section">
        <h2>{t.explore}</h2>
        <div className="tool-grid">
          <button className="tool-card" onClick={() => setScreen("prayers")}>
            <span className="tool-icon gold"><Icon name="prayer" /></span>
            <strong>{t.duas}</strong><small>{t.duasHint}</small>
          </button>
          <button className="tool-card" onClick={() => setScreen("map")}>
            <span className="tool-icon green"><Icon name="map" /></span>
            <strong>{t.map}</strong><small>{t.mapHint}</small>
          </button>
        </div>
      </section>
    </main>
  );
}
