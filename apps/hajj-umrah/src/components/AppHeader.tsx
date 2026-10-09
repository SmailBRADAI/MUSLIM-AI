import { LANGUAGES, languageNames, useLanguage, useT } from "../i18n";
import type { Language } from "../i18n";
import { Icon } from "./Icon";

export function AppHeader({ onLanguageChange }: { onLanguageChange: (language: Language) => void }) {
  const t = useT();
  const language = useLanguage();
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark"><Icon name="moon" size={19} /></span>
        <span>{t.appName}</span>
      </div>
      <div className="language-switcher" role="group" aria-label={t.a11y.language}>
        {LANGUAGES.map((lang) => (
          <button
            className={language === lang ? "language active" : "language"}
            onClick={() => onLanguageChange(lang)}
            aria-pressed={language === lang}
            aria-label={languageNames[lang].name}
            lang={lang}
            key={lang}
          >
            {languageNames[lang].short}
          </button>
        ))}
      </div>
    </header>
  );
}
