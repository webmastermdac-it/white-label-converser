import { describe, expect, it } from "vitest";
import { translateFromEnglish, tx } from "@/hooks/useLanguage";
import { appDictionaries } from "@/i18n/app";

describe("back-office translations", () => {
  it("translates dashboard strings into the extra languages", () => {
    expect(translateFromEnglish("Guest requests", "fr", "Richieste ospiti")).toBe("Demandes des clients");
    expect(translateFromEnglish("Guest requests", "de", "Richieste ospiti")).toBe("Gästeanfragen");
    expect(translateFromEnglish("Guest requests", "it", "Richieste ospiti")).toBe("Richieste ospiti");
  });

  it("falls back to English for unknown strings", () => {
    expect(translateFromEnglish("Not in any dictionary", "es")).toBe("Not in any dictionary");
  });

  it("fills positional values in the chosen text", () => {
    expect(tx("{0} products", "{0} prodotti", [3])).toMatch(/^3 /);
  });

  it("keeps placeholders in every dictionary entry", () => {
    for (const dict of Object.values(appDictionaries)) {
      for (const [en, translated] of Object.entries(dict)) {
        const tokens = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort().join();
        expect(tokens(translated), en).toBe(tokens(en));
      }
    }
  });
});
