import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import ar from "./ar.json";
import en from "./en.json";
import ur from "./ur.json";

export type Language = "ar" | "en" | "ur";
export type Strings = typeof en;

export const LANGUAGES: readonly Language[] = ["ar", "en", "ur"];

// `satisfies` makes TypeScript fail the build if a language file is missing a key.
export const strings = { ar, en, ur } satisfies Record<Language, Strings>;

export const languageNames: Record<Language, { short: string; name: string }> = {
  ar: { short: "ع", name: "العربية" },
  en: { short: "EN", name: "English" },
  ur: { short: "اُ", name: "اردو" },
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export function isRtl(language: Language) {
  return language !== "en";
}

const I18nContext = createContext<{ language: Language; t: Strings }>({ language: "ar", t: strings.ar });

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  return <I18nContext.Provider value={{ language, t: strings[language] }}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext).t;
}

export function useLanguage() {
  return useContext(I18nContext).language;
}
