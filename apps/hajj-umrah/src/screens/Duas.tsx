import { SupplicationCard } from "../components/SupplicationCard";
import { allSupplications } from "../data/supplications";
import { useLanguage, useT } from "../i18n";

/** T035 (FR-030): every supplication in the app, with source, grading and review status. */
export function Duas() {
  const t = useT();
  const language = useLanguage();
  return (
    <main className="page duas-page">
      <h1>{t.duas}</h1>
      <p className="ask-intro">{t.duasScreen.intro}</p>
      <section className="supplications-panel" aria-label={t.duas}>
        <ul>
          {allSupplications(language).map((item) => <SupplicationCard key={item.supplication.id} item={item} />)}
        </ul>
      </section>
    </main>
  );
}
