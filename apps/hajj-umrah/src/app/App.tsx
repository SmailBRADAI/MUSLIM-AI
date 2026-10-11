import { useEffect, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { SettingsPanel } from "../components/SettingsPanel";
import { Sites } from "../screens/Sites";
import { Icon } from "../components/Icon";
import * as db from "../data/db";
import { readCardPreference } from "../data/lockcard";
import { journeyContent } from "../data/content";
import { fetchManifest, loadPack } from "../data/packs";
import type { PackState } from "../data/packs";
import { completion, currentStep, setStepDone, withStep } from "../data/progress";
import type { JourneyType } from "../data/types";
import { I18nProvider, isRtl, strings } from "../i18n";
import type { Language } from "../i18n";
import { Guide, GuideNotReady } from "../screens/Guide";
import { Home } from "../screens/Home";
import { Onboarding } from "../screens/Onboarding";
import { Placeholder } from "../screens/Placeholder";
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
  const [pack, setPack] = useState<PackState>({ state: "none" });
  const [packCheck, setPackCheck] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [journey, setJourneyState] = useState<JourneyType | null>(null);
  // Set while choosing a journey: first launch starts at "language", changing it from Settings at "journey".
  const [onboarding, setOnboarding] = useState<OnboardingStep | null>(null);
  // T048: Live mode is off at each launch and never stored; the location is watched only in the Guide.
  const [live, setLive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideSlot, setGuideSlot] = useState<HTMLElement | null>(null);
  // T051: the lock-screen card is remembered on the device, but only counts as on while notifications are still allowed.
  const [lockCard, setLockCard] = useState(readCardPreference);

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

  // T028: the installed pack for the current language drives "Ready offline" and the guide's content.
  useEffect(() => {
    let cancelled = false;
    // Never show the previous language's pack while this one loads.
    setPack({ state: "none" });
    loadPack(language)
      .catch((): PackState => ({ state: "none" }))
      .then((state) => !cancelled && setPack(state));
    return () => {
      cancelled = true;
    };
  }, [language, packCheck]);

  // T029: when online, look for a newer pack in the background. The installed version stays in use;
  // the pilgrim updates from Settings when they choose (FR-009). Failures are ignored.
  const installedVersion = pack.state === "ready" && pack.pack.language === language ? pack.pack.version : null;
  useEffect(() => {
    setUpdateAvailable(false);
    if (!installedVersion) return;
    let cancelled = false;
    const check = () => {
      if (!navigator.onLine) return;
      fetchManifest()
        .then((m) => {
          const latest = m.packs.find((p) => p.language === language);
          if (!cancelled && latest && latest.version !== installedVersion) setUpdateAvailable(true);
        })
        .catch(() => undefined);
    };
    check();
    // Also check when the connection comes back.
    window.addEventListener("online", check);
    return () => {
      cancelled = true;
      window.removeEventListener("online", check);
    };
  }, [language, installedVersion]);

  // T051: a tap on the lock-screen card while the app is closed opens it at the Guide.
  useEffect(() => {
    if (!ready) return;
    try {
      const url = new URL(location.href);
      if (url.searchParams.get("open") !== "guide") return;
      url.searchParams.delete("open");
      history.replaceState(null, "", url);
      setScreen("guide");
    } catch {
      // No URL support or history access: the app simply opens at Home.
    }
  }, [ready]);

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

  // Home's journey cards: the chosen journey opens its guide; Umrah switches straight away, and Hajj
  // asks the type first (T032).
  const openJourney = async (kind: "umrah" | "hajj") => {
    const isHajj = journey !== null && journey !== "umrah";
    if ((kind === "umrah" && journey === "umrah") || (kind === "hajj" && isHajj)) return setScreen("guide");
    if (kind === "hajj") return setOnboarding("hajjType");
    await chooseJourney("umrah");
    setScreen("guide");
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
  const content = journey ? journeyContent(journey, language, pack.state === "ready" ? pack.content : null) : null;
  const current = content ? currentStep(content.journey, completed) : null;
  const homeStatus = content && {
    done: !current,
    currentTitle: current ? (content.texts[current.id]?.title ?? null) : null,
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
        <AppHeader settingsOpen={settingsOpen} onToggleSettings={() => setSettingsOpen((open) => !open)} />
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          journey={journey}
          onLanguageChange={changeLanguage}
          onChangeJourney={() => setOnboarding("journey")}
          onPackInstalled={() => setPackCheck((n) => n + 1)}
          onGuideSlot={setGuideSlot}
          showGuideSection={screen === "guide" && !!content}
        />
        {choiceNotSaved && (
          <p className="save-note save-failed" role="alert"><Icon name="shield" size={16} />{strings[language].choiceNotSaved}</p>
        )}
        {screen === "home" && (
          <Home
            setScreen={setScreen}
            onOpenSettings={() => setSettingsOpen(true)}
            status={homeStatus}
            pack={pack}
            updateAvailable={updateAvailable}
            journey={journey}
            onOpenJourney={openJourney}
          />
        )}
        {screen === "guide" && content && (
          <Guide key={journey} journey={content.journey} texts={content.texts} completed={completed} onStepDone={markStep} saveFailed={saveFailed} live={live} onLiveChange={setLive} lockCard={lockCard} onLockCardChange={setLockCard} settingsSlot={guideSlot} closeSettings={() => setSettingsOpen(false)} />
        )}
        {screen === "guide" && !content && <GuideNotReady />}
        {screen === "sites" && <Sites />}
        {(screen === "prayers" || screen === "map") && <Placeholder screen={screen} setScreen={setScreen} />}
        <BottomNav screen={screen} setScreen={setScreen} />
      </div>
    </I18nProvider>
  );
}
