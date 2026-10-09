import { describe, expect, it } from "vitest";
import { strings } from "../../src/i18n";

function keys(value: unknown, prefix = ""): string[] {
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("i18n", () => {
  it("has the same keys in Arabic, English and Urdu (constitution III)", () => {
    const en = keys(strings.en).sort();
    expect(keys(strings.ar).sort()).toEqual(en);
    expect(keys(strings.ur).sort()).toEqual(en);
  });

  it("has no empty strings", () => {
    for (const lang of ["ar", "en", "ur"] as const) {
      for (const key of keys(strings[lang])) {
        const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], strings[lang]);
        expect(value, `${lang}.${key}`).not.toBe("");
      }
    }
  });
});
