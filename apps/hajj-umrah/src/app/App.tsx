import { useEffect, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { Icon } from "../components/Icon";
import * as db from "../data/db";
import { journeyContent } from "../data/content";
import { completion, currentStep, setStepDone, withStep } from "../data/progress";
import type { JourneyType } from "../data/types";
import { I18nProvider, isRtl, strings } from "../i18n";
import type { Language } from "../i18n";
import { Guide, GuideNotReady } from "../screens/Guide";
import { Home } from "../screens/Home";
import { Onboarding } from "../screens/Onboarding";
import { Placeholder } from "../screens/Placeholder";
import { Settings } from "../screens/Settings";
import type { OnboardingStep, Screen } from "./screens";

// Some WebKit versions never settle indexedDB.open; never leave the pilgrim on a blank screen.
const STARTUP_TIMEOUT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [language, setLanguageState] = useState<Language>("ar");
  const [completed, setCompletedState] = useState<string[]>([]);
  // Saves read the latest list, not the one captured when the handler was created.
  const completedRef = useRef<string[]>([]);
  const setCompleted = (next: string[]) => {
    completedRef.current = next;
    setCompletedState(next);
  };
  const [screen, setScreen] = useState<Screen>("home");
  const [saveFailed, setSaveFailed] = useState(false);
  const [choiceNotSaved, setChoiceNotSaved] = useState(false);
  const [journey, setJourneyState] = useState<JourneyType | null>(null);
  // Set while choosing a journey: first launch starts at "language", changing it from Settings at "journey".
  const [onboarding, setOnboarding] = useState<OnboardingStep | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [storedLanguage, storedJourney] = await Promise.all([db.getLanguage(), db.getJourney()]);
      const progress = storedJourney ? await db.getProgress(storedJourney) : null;
      return { storedLanguage, storedJourney, progress };
    };
    withTimeout(load(), STARTUP_TIMEOUT_MS)
      .then(({ storedLanguage, storedJourney, progress }) => {
        if (cancelled) return;
        if (storedLanguage) setLanguageState(storedLanguage);
        setJourneyState(storedJourney);
        // Only a confirmed empty store means first launch.
        if (!storedJourney) setOnboarding("language");
        setCompleted(progress?.completedStepIds ?? []);
      })
      // IndexedDB unavailable or too slow: we can't tell a new pilgrim from a returning one, so don't
      // run onboarding (it would overwrite a saved journey). Open the Umrah guide for this session.
      .catch(() => !cancelled && setJourneyState("umrah"))
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dir = isRtl(language) ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  // Constitution II: progress is written to the device before the UI moves on. If the write fails,
  // the step still moves on for this session but the guide says progress was not saved (FR-018).
  const markStep = async (stepId: string, done: boolean) => {
    if (!journey) return;
    try {
      setCompleted(await setStepDone(journey, completedRef.current, stepId, done));
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
      setCompleted(withStep(completedRef.current, stepId, done));
    }
  };

  // Each journey keeps its own progress, so switching back restores it.
  const chooseJourney = async (next: JourneyType) => {
    let progress: string[] = [];
    try {
      await db.setJourney(next);
      progress = (await db.getProgress(next)).completedStepIds;
      setChoiceNotSaved(false);
    } catch {
      setChoiceNotSaved(true);
    }
    setJourneyState(next);
    setCompleted(progress);
    setSaveFailed(false);
    setOnboarding(null);
    setScreen("home");
  };

  const changeLanguage = async (next: Language) => {
    setLanguageState(next);
    try {
      await db.setLanguage(next);
    } catch {
      setChoiceNotSaved(true);
    }
  };

  if (!ready) return null;
  const content = journey ? journeyContent(journey) : null;
  const current = content ? currentStep(content.journey, completed) : null;
  const homeStatus = content && {
    done: !current,
    currentTitle: current ? (content.texts[language][current.id]?.title ?? null) : null,
    percent: Math.round(completion(content.journey, completed) * 100),
  };

  if (onboarding) {
    return (
      <I18nProvider language={language}>
        <div className={`app-shell onboarding-shell language-${language}`}>
          <Onboarding
            initialStep={onboarding}
            onLanguageChange={changeLanguage}
            onDone={chooseJourney}
            // A pilgrim changing journey from Settings can go back to Settings.
            onCancel={journey ? () => setOnboarding(null) : undefined}
          />
        </div>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider language={language}>
      <div className={`app-shell language-${language}`}>
        <AppHeader onLanguageChange={changeLanguage} />
        {choiceNotSaved && (
          <p className="save-note save-failed" role="alert"><Icon name="shield" size={16} />{strings[language].choiceNotSaved}</p>
        )}
        {screen === "home" && <Home setScreen={setScreen} status={homeStatus} />}
        {screen === "guide" && content && (
          <Guide key={journey} journey={content.journey} texts={content.texts[language]} completed={completed} onStepDone={markStep} saveFailed={saveFailed} />
        )}
        {screen === "guide" && !content && <GuideNotReady />}
        {screen === "settings" && journey && (
          <Settings journey={journey} onLanguageChange={changeLanguage} onChangeJourney={() => setOnboarding("journey")} />
        )}
        {(screen === "prayers" || screen === "map") && <Placeholder screen={screen} setScreen={setScreen} />}
        <BottomNav screen={screen} setScreen={setScreen} />
      </div>
    </I18nProvider>
  );
}
