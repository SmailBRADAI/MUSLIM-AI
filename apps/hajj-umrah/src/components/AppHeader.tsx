import { useT } from "../i18n";
import { Icon } from "./Icon";

/** FR-032: the only settings entry; it opens the side panel. */
export function AppHeader({ settingsOpen, onToggleSettings }: { settingsOpen: boolean; onToggleSettings: () => void }) {
  const t = useT();
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark"><Icon name="moon" size={19} /></span>
        <span>{t.appName}</span>
      </div>
      <button
        type="button"
        className="settings-button"
        onClick={onToggleSettings}
        aria-label={t.settings}
        aria-expanded={settingsOpen}
        aria-controls="settings-panel"
        aria-haspopup="dialog"
      >
        <Icon name="settings" />
      </button>
    </header>
  );
}
