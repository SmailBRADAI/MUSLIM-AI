import { LANGUAGES, languageNames, useLanguage, useT } from "../i18n";
import type { Language } from "../i18n";
import { Icon } from "./Icon";

/** Large language buttons used by onboarding and settings. */
export function LanguageChoiceList({ onChange }: { onChange: (language: Language) => void }) {
  const t = useT();
  const language = useLanguage();
  return (
    <div className="choice-list" role="group" aria-label={t.a11y.language}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          lang={lang}
          dir={lang === "en" ? "ltr" : "rtl"}
          className={language === lang ? "choice-card selected" : "choice-card"}
          aria-pressed={language === lang}
          onClick={() => onChange(lang)}
        >
          <strong>{languageNames[lang].name}</strong>
          {language === lang && <span className="choice-check"><Icon name="check" size={17} /></span>}
        </button>
      ))}
    </div>
  );
}
