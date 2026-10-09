import type { Screen } from "../app/screens";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/Icon";
import { useT } from "../i18n";

export function Placeholder({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const t = useT();
  const icon: IconName = screen === "map" ? "map" : screen === "settings" ? "download" : "prayer";
  const title = screen === "map" ? t.map : screen === "settings" ? t.offline : t.duas;
  return (
    <main className="page placeholder-page">
      <span className="placeholder-icon"><Icon name={icon} size={34} /></span>
      <h1>{title}</h1>
      <p>{t.notAvailable}</p>
      <div className="download-summary"><Icon name="shield" /><span>{t.offlineMeta}</span><Icon name="check" /></div>
      <button className="complete-button" onClick={() => setScreen("home")}><Icon name="home" />{t.back}</button>
    </main>
  );
}
