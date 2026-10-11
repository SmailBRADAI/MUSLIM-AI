import type { StepSupplication } from "../data/supplications";
import { displayStatus } from "../data/types";
import { useT } from "../i18n";
import { ReviewBadge } from "./ReviewBadge";

/** One supplication with its text, scope, source, grading and review badge (FR-030); used by the Guide and the Duas screen. */
export function SupplicationCard({ item: { supplication, text: s } }: { item: StepSupplication }) {
  const t = useT();
  return (
    <li className={`supplication ${supplication.scope}`}>
      <div className="supplication-head">
        <strong>{s.title}</strong>
        <span className={`scope-tag ${supplication.scope}`}>
          {supplication.scope === "specific" ? t.supplications.specific : t.supplications.general}
        </span>
        <ReviewBadge status={displayStatus(supplication, s)} />
      </div>
      <p className="supplication-arabic" lang="ar" dir="rtl">{supplication.arabic}</p>
      {s.transliteration && <p className="supplication-translit" lang="en" dir="ltr"><span>{t.supplications.transliteration}: </span>{s.transliteration}</p>}
      {s.meaning && <p className="supplication-meaning"><span>{t.supplications.meaning}: </span>{s.meaning}</p>}
      <p className="supplication-when"><span>{t.supplications.when}: </span>{s.when}</p>
      <p className="supplication-source">
        <span>{t.supplications.source}: </span>
        <bdi lang="ar" dir="rtl">{supplication.meta.source.join("؛ ")}</bdi>
        {" · "}{t.supplications.grading[supplication.grading]}
      </p>
    </li>
  );
}
