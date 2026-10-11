import { useEffect, useRef, useState } from "react";
import type { JourneyType } from "../data/types";
import { useT } from "../i18n";
import type { Language } from "../i18n";
import { Icon } from "./Icon";
import { LanguageChoiceList } from "./LanguageChoiceList";
import { Switch } from "./LockCard";
import { getSetting, setSetting } from "../data/db";
import { OfflinePacks } from "./OfflinePacks";

/**
 * FR-032: language, journey, offline downloads and the Guide switches in one side panel.
 * It stays mounted while closed (inert and hidden) so the Guide switches rendered into `guideSlot` keep their state.
 */
export function SettingsPanel({
  open,
  onClose,
  journey,
  onLanguageChange,
  onChangeJourney,
  onPackInstalled,
  onGuideSlot,
  showGuideSection,
}: {
  open: boolean;
  onClose: () => void;
  journey: JourneyType | null;
  onLanguageChange: (language: Language) => void;
  onChangeJourney: () => void;
  onPackInstalled: () => void;
  /** Receives the element the Guide renders its switches into. */
  onGuideSlot: (element: HTMLElement | null) => void;
  showGuideSection: boolean;
}) {
  const t = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  // T062 (FR-038): large text is remembered on the device and applied to the whole app.
  const [largeText, setLargeText] = useState(false);
  useEffect(() => {
    getSetting<boolean>("largeText").then((v) => v === true && setLargeText(true)).catch(() => undefined);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
  }, [largeText]);
  const setLarge = (next: boolean) => {
    setLargeText(next);
    setSetting("largeText", next).catch(() => undefined);
  };
  const wasOpen = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // The pack manifest is fetched only after the panel has been opened once (T029: nothing runs in the background).
  const [opened, setOpened] = useState(open);
  useEffect(() => { if (open) setOpened(true); }, [open]);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      closeRef.current?.focus();
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") onCloseRef.current();
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      document.querySelector<HTMLElement>(".settings-button")?.focus();
    }
  }, [open]);

  return (
    <>
      {/* A tap outside closes the panel; keyboard users have the close button and Escape. */}
      <div className="settings-backdrop" onClick={onClose} aria-hidden="true" hidden={!open} />
      <aside
        id="settings-panel"
        className={open ? "settings-panel open" : "settings-panel"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-panel-title"
        inert={!open}
      >
        <div className="settings-panel-head">
          <h2 id="settings-panel-title">{t.settings}</h2>
          <button type="button" ref={closeRef} className="settings-close" onClick={onClose} aria-label={t.settingsScreen.close}>
            <Icon name="close" />
          </button>
        </div>

        <section className="settings-group">
          <h3>{t.settingsScreen.language}</h3>
          <LanguageChoiceList onChange={onLanguageChange} />
        </section>

        {journey && (
          <section className="settings-group">
            <h3>{t.settingsScreen.journey}</h3>
            <button className="choice-card" onClick={() => { onClose(); onChangeJourney(); }}>
              <span className="grow"><strong>{t.journeys[journey]}</strong><small>{t.settingsScreen.progressKept}</small></span>
              <span className="text-link">{t.settingsScreen.change}</span>
            </button>
          </section>
        )}

        <section className="settings-group">
          <h3>{t.display.title}</h3>
          <Switch id="large-text" title={t.display.largeTitle} hint={t.display.largeHint} on={largeText} onClick={() => setLarge(!largeText)} />
        </section>

        <section className="settings-group" id="offline">
          <h3>{t.packs.title}</h3>
          {opened && <OfflinePacks onInstalled={onPackInstalled} />}
        </section>

        <section className="settings-group" hidden={!showGuideSection}>
          <h3>{t.settingsScreen.guide}</h3>
          <div ref={onGuideSlot} className="settings-guide-slot" />
        </section>
      </aside>
    </>
  );
}
