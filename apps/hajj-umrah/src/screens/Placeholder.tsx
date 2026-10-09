import type { PlaceholderScreen, Screen } from "../app/screens";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/Icon";
import { useT } from "../i18n";

export function Placeholder({ screen, setScreen }: { screen: PlaceholderScreen; setScreen: (s: Screen) => void }) {
  const t = useT();
  const icon: IconName = screen === "map" ? "map" : "prayer";
  const title = screen === "map" ? t.map : t.duas;
  return (
    <main className="page placeholder-page">
      <span className="placeholder-icon"><Icon name={icon} size={34} /></span>
      <h1>{title}</h1>
      <p>{t.notAvailable}</p>
      <button className="complete-button" onClick={() => setScreen("home")}><Icon name="home" />{t.back}</button>
    </main>
  );
}
