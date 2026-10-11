// T059 (FR-035): answers to a pilgrim's question, found by searching the reviewed content in the app.
// Nothing is generated: every result is existing step or supplication text, with its sources and review
// status. A question with no match says so (constitution I: the app never invents rulings or supplications).
import type { StepTexts } from "./content";
import { allSupplications } from "./supplications";
import type { Journey, ReviewStatus } from "./types";
import { displayStatus } from "./types";
import type { Language } from "../i18n";

export interface Doc {
  kind: "step" | "supplication";
  id: string;
  title: string;
  /** Text searched and quoted, in the pilgrim's language. */
  parts: { text: string; weight: number }[];
  /** Arabic text of a supplication, shown with its result. */
  arabic?: string;
  sources: string[];
  status: ReviewStatus;
}

export interface Result {
  doc: Doc;
  score: number;
  /** The passage that matched best. */
  excerpt: string;
}

const MARKS = /[ً-ٰٟۖ-ۭـ]/g;

/** Lowercases, strips Arabic marks and unifies letter variants so "الإحرام" and "الاحرام" match. */
export function normalize(text: string) {
  return text
    .normalize("NFKD")
    .replace(MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ێۍ]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[ھ]/g, "ہ")
    .toLowerCase();
}

const STOP = new Set(
  ["the", "a", "an", "is", "are", "do", "does", "i", "my", "to", "of", "in", "on", "for", "and", "or", "what", "how", "when", "where", "can", "should", "it", "me",
   "ما", "ماذا", "كيف", "متى", "اين", "هل", "في", "من", "علي", "عن", "الي", "او", "و", "هذا", "هذه",
   "کیا", "کب", "کیسے", "کہاں", "میں", "کا", "کی", "کے", "سے", "کو", "اور", "ہے", "ہیں"].map((w) => normalize(w)),
);

export function tokens(query: string) {
  return normalize(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 && !STOP.has(w));
}

/** The reviewed content of the journey the pilgrim follows, plus every supplication, in one language. */
export function buildDocs(journey: Journey, texts: StepTexts, language: Language): Doc[] {
  const docs: Doc[] = [];
  for (const stage of journey.stages) {
    for (const step of stage.steps) {
      const text = texts[step.id];
      if (!text) continue;
      docs.push({
        kind: "step",
        id: step.id,
        title: text.title,
        parts: [
          { text: text.title, weight: 4 },
          { text: text.instruction, weight: 2 },
          { text: text.details, weight: 1 },
          { text: text.mistakes, weight: 1 },
        ],
        sources: step.meta.source,
        status: displayStatus(step, text),
      });
    }
  }
  for (const { supplication, text } of allSupplications(language)) {
    docs.push({
      kind: "supplication",
      id: supplication.id,
      title: text.title,
      parts: [
        { text: text.title, weight: 4 },
        { text: text.when, weight: 2 },
        ...(text.meaning ? [{ text: text.meaning, weight: 1 }] : []),
        ...(text.transliteration ? [{ text: text.transliteration, weight: 1 }] : []),
      ],
      arabic: supplication.arabic,
      sources: supplication.meta.source,
      status: displayStatus(supplication, text),
    });
  }
  return docs;
}

const sentences = (text: string) => text.split(/(?<=[.!?؟۔])\s+|\n+/u).map((s) => s.trim()).filter(Boolean);

/** Results best first. A word matches when it starts a word of the text (so "tawaf" finds "Tawaf's"). */
export function search(query: string, docs: readonly Doc[], limit = 5): Result[] {
  const words = tokens(query);
  if (!words.length) return [];
  const results: Result[] = [];
  for (const doc of docs) {
    let score = 0;
    let best = { points: 0, text: "" };
    const matched = new Set<string>();
    for (const part of doc.parts) {
      for (const sentence of sentences(part.text)) {
        const norm = normalize(sentence);
        const sentenceWords = norm.split(/[^\p{L}\p{N}]+/u);
        let points = 0;
        for (const w of words) {
          if (sentenceWords.some((s) => s.startsWith(w) || (w.length >= 4 && s.includes(w)))) {
            points += part.weight;
            matched.add(w);
          }
        }
        if (points > best.points) best = { points, text: sentence };
        score += points;
      }
    }
    // Every word of the question matching somewhere is worth more than one word matching many times.
    if (score > 0) results.push({ doc, score: score + matched.size * 5, excerpt: best.text });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
