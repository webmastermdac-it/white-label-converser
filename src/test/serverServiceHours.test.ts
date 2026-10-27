import { describe, expect, it } from "vitest";
import { isWithinServiceHours } from "../../supabase/functions/_shared/serviceHours";

// 2026-10-27 is CET (UTC+1): 08:30 UTC = 09:30 in Rome
const at = (utc: string) => new Date(`2026-10-27T${utc}:00Z`);
describe("server service hours (Europe/Rome)", () => {
  const hours = { enabled: true, start: "08:00", end: "20:00" };
  it("is open inside the window", () => expect(isWithinServiceHours(hours, at("08:30"))).toBe(true));
  it("is closed at night", () => expect(isWithinServiceHours(hours, at("22:30"))).toBe(false));
  it("is closed just before opening (Rome time)", () => expect(isWithinServiceHours(hours, at("06:30"))).toBe(false));
  it("is always open when disabled", () => expect(isWithinServiceHours({ enabled: false, start: "08:00", end: "20:00" }, at("23:30"))).toBe(true));
  it("handles overnight windows", () => expect(isWithinServiceHours({ enabled: true, start: "22:00", end: "06:00" }, at("23:30"))).toBe(true));
});
