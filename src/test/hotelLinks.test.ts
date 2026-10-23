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
