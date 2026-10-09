import { useState } from "react";
import type { OnboardingStep } from "../app/screens";
import { Icon } from "../components/Icon";
import { LanguageChoiceList } from "../components/LanguageChoiceList";
import { HAJJ_TYPES } from "../data/types";
import type { JourneyType } from "../data/types";
import { useT } from "../i18n";
import type { Language } from "../i18n";

/**
 * US2: language, then Umrah or Hajj, then the Hajj type. Every choice is a large button;
 * nothing needs a gesture (constitution IV).
 */
export function Onboarding({
  initialStep = "language",
  onLanguageChange,
  onDone,
  onCancel,
}: {
  initialStep?: OnboardingStep;
  onLanguageChange: (language: Language) => void;
  onDone: (journey: JourneyType) => void;
  onCancel?: () => void;
}) {
  const t = useT();
  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const steps: OnboardingStep[] = initialStep === "language" ? ["language", "journey", "hajjType"] : ["journey", "hajjType"];
  const index = steps.indexOf(step);
  const back = index > 0 ? () => setStep(steps[index - 1]) : onCancel;

  return (
    <main className="page onboarding-page">
      <span className="brand-mark onboarding-mark"><Icon name="moon" size={26} /></span>
      <p className="eyebrow">{t.appName}</p>

      {step === "language" && (
        <>
          <h1>{t.onboarding.languageTitle}</h1>
          <LanguageChoiceList onChange={onLanguageChange} />
          <button className="complete-button" onClick={() => setStep("journey")}>
            {t.onboarding.continue}<Icon name="arrow" />
          </button>
        </>
      )}

      {step === "journey" && (
        <>
          <h1>{t.onboarding.journeyTitle}</h1>
          <div className="choice-list">
            <button className="choice-card" onClick={() => onDone("umrah")}>
              <span className="journey-icon"><Icon name="kaaba" size={28} /></span>
              <span className="grow"><strong>{t.umrah}</strong><small>{t.umrahHint}</small></span>
              <span className="subtle-arrow"><Icon name="arrow" size={19} /></span>
            </button>
            <button className="choice-card" onClick={() => setStep("hajjType")}>
              <span className="journey-icon light"><Icon name="moon" size={26} /></span>
              <span className="grow"><strong>{t.hajj}</strong><small>{t.hajjHint}</small></span>
              <span className="subtle-arrow"><Icon name="arrow" size={19} /></span>
            </button>
          </div>
        </>
      )}

      {/* TODO(T031): add reviewed explanations of each Hajj type from the content pack. */}
      {step === "hajjType" && (
        <>
          <h1>{t.onboarding.hajjTypeTitle}</h1>
          <div className="choice-list">
            {HAJJ_TYPES.map((type) => (
              <button key={type} className="choice-card" onClick={() => onDone(type)}>
                <span className="grow"><strong>{t.journeys[type]}</strong></span>
                <span className="subtle-arrow"><Icon name="arrow" size={19} /></span>
              </button>
            ))}
          </div>
        </>
      )}

      {back && <button className="previous-button" onClick={back}>{t.onboarding.back}</button>}
    </main>
  );
}
