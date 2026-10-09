import type { Ruling, RulingView } from "../data/types";
import { useT } from "../i18n";
import { Icon } from "./Icon";

/**
 * Ruling label per the declared framework (Ibn Baz and Ibn Al-Uthaymeen).
 * When the two sheikhs differ, each view is shown instead of a single label.
 */
export function RulingTag({ ruling, views }: { ruling: Ruling; views?: RulingView[] }) {
  const t = useT();
  const differs = views && new Set(views.map((v) => v.ruling)).size > 1;
  if (!differs) {
    return <span className="tag required"><Icon name="sparkle" size={14} />{t.ruling[ruling]}</span>;
  }
  return (
    <>
      {views.map((view) => (
        <span className="tag required" key={view.scholar} title={view.source}>
          {t.scholar[view.scholar]}: {t.ruling[view.ruling]}
        </span>
      ))}
    </>
  );
}
