import { useEffect, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import * as db from "../data/db";
import { I18nProvider, isRtl } from "../i18n";
import type { Language } from "../i18n";
import { Guide } from "../screens/Guide";
import { Home } from "../screens/Home";
import { Placeholder } from "../screens/Placeholder";
import type { Screen } from "./screens";

const JOURNEY_ID = "umrah";
const TAWAF_STEP_ID = "umrah.tawaf";
// Some WebKit versions never settle indexedDB.open; never leave the pilgrim on a blank screen.
const STARTUP_TIMEOUT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [language, setLanguageState] = useState<Language>("ar");
  const [completed, setCompleted] = useState<string[]>([]);
  const [screen, setScreen] = useState<Screen>("home");
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    withTimeout(Promise.all([db.getLanguage(), db.getProgress(JOURNEY_ID)]), STARTUP_TIMEOUT_MS)
      .then(([storedLanguage, progress]) => {
        if (cancelled) return;
        if (storedLanguage) setLanguageState(storedLanguage);
        setCompleted(progress.completedStepIds);
      })
      // IndexedDB unavailable or too slow: start with defaults; the app still works for this session.
      .catch(() => undefined)
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dir = isRtl(language) ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = (next: Language) => {
    setLanguageState(next);
    db.setLanguage(next).catch(() => undefined);
  };

  // Constitution II: progress is written to the device before the UI moves on. If the write fails,
  // the step still moves on for this session but the guide says progress was not saved (FR-018).
  const setTawafComplete = async (value: boolean) => {
    const next = value
      ? [...new Set([...completed, TAWAF_STEP_ID])]
      : completed.filter((id) => id !== TAWAF_STEP_ID);
    try {
      await db.saveProgress({ journeyId: JOURNEY_ID, completedStepIds: next, updatedAt: new Date().toISOString() });
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
    setCompleted(next);
  };

  if (!ready) return null;

  return (
    <I18nProvider language={language}>
      <div className={`app-shell language-${language}`}>
        <AppHeader onLanguageChange={changeLanguage} />
        {screen === "home" && <Home setScreen={setScreen} />}
        {screen === "guide" && <Guide complete={completed.includes(TAWAF_STEP_ID)} setComplete={setTawafComplete} saveFailed={saveFailed} />}
        {screen !== "home" && screen !== "guide" && <Placeholder screen={screen} setScreen={setScreen} />}
        <BottomNav screen={screen} setScreen={setScreen} />
      </div>
    </I18nProvider>
  );
}
