import { LanguageChoiceList } from "../components/LanguageChoiceList";
import { OfflinePacks } from "../components/OfflinePacks";
import type { JourneyType } from "../data/types";
import { useT } from "../i18n";
import type { Language } from "../i18n";

/** T015: change language and journey; progress is stored per journey, so nothing is lost. */
export function Settings({
  journey,
  onLanguageChange,
  onChangeJourney,
  onPackInstalled,
}: {
  journey: JourneyType;
  onLanguageChange: (language: Language) => void;
  onChangeJourney: () => void;
  onPackInstalled: () => void;
}) {
  const t = useT();
  return (
    <main className="page settings-page">
      <h1>{t.settings}</h1>

      <section className="settings-group">
        <h2>{t.settingsScreen.language}</h2>
        <LanguageChoiceList onChange={onLanguageChange} />
      </section>

      <section className="settings-group">
        <h2>{t.settingsScreen.journey}</h2>
        <button className="choice-card" onClick={onChangeJourney}>
          <span className="grow"><strong>{t.journeys[journey]}</strong><small>{t.settingsScreen.progressKept}</small></span>
          <span className="text-link">{t.settingsScreen.change}</span>
        </button>
      </section>

      <section className="settings-group" id="offline">
        <h2>{t.packs.title}</h2>
        <OfflinePacks onInstalled={onPackInstalled} />
      </section>
    </main>
  );
}
