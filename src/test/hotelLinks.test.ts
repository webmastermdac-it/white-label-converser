import { describe, it, expect } from "vitest";
import { normalizeHotelProfile } from "@/lib/hotelProfile";
import { buildHotelContext } from "../../supabase/functions/chat/hotelContext";

describe("hotel links", () => {
  it("normalizeHotelProfile defaults new fields", () => {
    const h = normalizeHotelProfile({ rooms: [{ name: "Suite" }], services: [{ name: "Spa" }] });
    expect(h.property.website).toBe("");
    expect(h.rooms[0].url).toBe("");
    expect(h.services[0].url).toBe("");
    expect(h.pages).toEqual([]);
  });
  it("buildHotelContext includes website, page urls and PAGES", () => {
    const out = buildHotelContext({
      property: { name: "H", website: "https://h.it" },
      rooms: [{ name: "Suite", url: "https://h.it/suite" }],
      services: [{ name: "Spa", url: "https://h.it/spa" }],
      pages: [{ name: "Contatti", url: "https://h.it/contatti" }],
    }, false);
    expect(out).toContain("- Website: https://h.it");
    expect(out).toContain("page: https://h.it/suite");
    expect(out).toContain("page: https://h.it/spa");
    expect(out).toContain("PAGES\n- Contatti: https://h.it/contatti");
  });
});

import { pickLink } from "../../supabase/functions/chat/hotelContext";
import { resolveReplyLang } from "../../supabase/functions/chat/language";

describe("hotel link language", () => {
  it("it visitor → IT link", () => expect(pickLink("https://h.it/camere", "https://h.it/en/rooms", "it")).toBe("https://h.it/camere"));
  it("de/fr/en visitor → EN link", () => {
    for (const l of ["de", "fr", "en"]) expect(pickLink("https://h.it/camere", "https://h.it/en/rooms", l)).toBe("https://h.it/en/rooms");
  });
  it("no url_en → IT fallback", () => expect(pickLink("https://h.it/camere", "", "de")).toBe("https://h.it/camere"));
  it("normalize preserves url_en", () => {
    const h = normalizeHotelProfile({ property: { website_en: "https://h.it/en" }, rooms: [{ name: "S", url_en: "https://h.it/en/s" }], services: [{ name: "Spa", url_en: "https://h.it/en/spa" }], pages: [{ name: "P", url_en: "https://h.it/en/p" }] });
    expect([h.property.website_en, h.rooms[0].url_en, h.services[0].url_en, h.pages[0].url_en]).toEqual(["https://h.it/en", "https://h.it/en/s", "https://h.it/en/spa", "https://h.it/en/p"]);
  });
  it("unsupported language → en", () => {
    expect(resolveReplyLang("sv-SE")).toBe("en");
    expect(resolveReplyLang("de-DE")).toBe("de");
  });
});
