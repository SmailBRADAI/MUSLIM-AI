import type { Screen } from "../app/screens";
import { useT } from "../i18n";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export function BottomNav({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const t = useT();
  const items: { screen: Screen; icon: IconName; label: string }[] = [
    { screen: "home", icon: "home", label: t.home },
    { screen: "guide", icon: "book", label: t.guide },
    { screen: "prayers", icon: "prayer", label: t.duas },
  ];
  return (
    <nav className="bottom-nav" aria-label={t.a11y.mainNav}>
      {items.map((item) => (
        <button
          key={item.screen}
          onClick={() => setScreen(item.screen)}
          className={screen === item.screen ? "nav-item active" : "nav-item"}
          aria-current={screen === item.screen ? "page" : undefined}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
