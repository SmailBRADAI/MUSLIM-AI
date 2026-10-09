import { Icon } from "../components/Icon";
import { LanguageChoiceList } from "../components/LanguageChoiceList";
import type { JourneyType } from "../data/types";
import { useT } from "../i18n";
import type { Language } from "../i18n";

/** T015: change language and journey; progress is stored per journey, so nothing is lost. */
export function Settings({
  journey,
  onLanguageChange,
  onChangeJourney,
}: {
  journey: JourneyType;
  onLanguageChange: (language: Language) => void;
  onChangeJourney: () => void;
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

      {/* TODO(T027, T028): replace with the real download screen and offline status. */}
      <section className="settings-group">
        <h2>{t.offline}</h2>
        <div className="download-summary"><Icon name="shield" /><span>{t.offlineMeta}</span><Icon name="check" /></div>
      </section>
    </main>
  );
}
