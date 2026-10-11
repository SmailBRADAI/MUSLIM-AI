import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { getSetting, setSetting } from "../data/db";
import { useT } from "../i18n";

// T061 (FR-037): the pilgrim's own details, kept only on this device, with the emergency numbers in Saudi Arabia.
const FIELDS = ["name", "hotel", "leader", "leaderPhone", "relativePhone", "blood", "medical", "notes"] as const;
type Field = (typeof FIELDS)[number];
type Card = Record<Field, string>;
const PHONES: Field[] = ["leaderPhone", "relativePhone"];
const EMPTY: Card = { name: "", hotel: "", leader: "", leaderPhone: "", relativePhone: "", blood: "", medical: "", notes: "" };
// General knowledge, marked "pending verification" on screen until the reviewer confirms them (constitution I).
const NUMBERS = [
  { key: "ambulance", number: "997" },
  { key: "police", number: "999" },
  { key: "civilDefense", number: "998" },
  { key: "unified", number: "911" },
] as const;

const telHref = (value: string) => `tel:${value.replace(/[^\d+]/g, "")}`;

export function Emergency() {
  const t = useT();
  const [card, setCard] = useState<Card>(EMPTY);
  const [editing, setEditing] = useState(true);
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");

  useEffect(() => {
    let cancelled = false;
    getSetting<Partial<Card>>("emergency")
      .then((stored) => {
        if (cancelled || !stored) return;
        setCard({ ...EMPTY, ...stored });
        setEditing(false);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await setSetting("emergency", card);
      setStatus("saved");
      setEditing(false);
    } catch {
      setStatus("failed");
    }
  };
  const filled = FIELDS.filter((f) => card[f].trim());

  return (
    <main className="page emergency-page">
      <h1>{t.emergency.title}</h1>
      <p className="ask-intro">{t.emergency.intro}</p>

      {editing ? (
        <form className="ask-form" onSubmit={save}>
          {FIELDS.map((field) => (
            <div key={field} className="field">
              <label htmlFor={`em-${field}`}>{t.emergency[field]}</label>
              {field === "medical" || field === "notes" ? (
                <textarea id={`em-${field}`} rows={3} value={card[field]} onChange={(e) => setCard({ ...card, [field]: e.target.value })} />
              ) : (
                <input id={`em-${field}`} type={PHONES.includes(field) ? "tel" : "text"} value={card[field]} onChange={(e) => setCard({ ...card, [field]: e.target.value })} />
              )}
            </div>
          ))}
          <button type="submit" className="complete-button"><Icon name="check" />{t.emergency.save}</button>
          {status === "failed" && <p className="save-note save-failed" role="alert">{t.emergency.notSaved}</p>}
        </form>
      ) : (
        <section className="emergency-card" aria-label={t.emergency.title}>
          {filled.length === 0 && <p>{t.emergency.empty}</p>}
          <dl>
            {filled.map((field) => (
              <div key={field}>
                <dt>{t.emergency[field]}</dt>
                <dd>
                  {PHONES.includes(field) ? <a href={telHref(card[field])} className="call-link">{t.emergency.call}: <bdi dir="ltr">{card[field]}</bdi></a> : card[field]}
                </dd>
              </div>
            ))}
          </dl>
          {status === "saved" && <p className="save-note" role="status">{t.emergency.saved}</p>}
          <button type="button" className="pack-button" onClick={() => { setStatus("idle"); setEditing(true); }}>{t.emergency.edit}</button>
        </section>
      )}

      <section className="emergency-numbers" aria-labelledby="em-numbers">
        <h2 id="em-numbers">{t.emergency.numbers}</h2>
        <ul>
          {NUMBERS.map(({ key, number }) => (
            <li key={key}>
              <span className="grow">{t.emergency[key]}</span>
              <a href={telHref(number)} className="call-link" aria-label={`${t.emergency.call}: ${t.emergency[key]} ${number}`}><bdi dir="ltr">{number}</bdi></a>
            </li>
          ))}
        </ul>
        <p className="ask-scholar"><Icon name="shield" size={16} />{t.emergency.verify}</p>
      </section>
    </main>
  );
}
