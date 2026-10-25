import { describe, expect, it } from "vitest";
import { isWithinServiceHours } from "@/lib/serviceHours";
import { normalizeHotelProfile } from "@/lib/hotelProfile";
import { buildHotelContext } from "../../supabase/functions/chat/hotelContext";

const at = (hour: number, minute = 0) => new Date(2026, 9, 25, hour, minute);
const hours = { enabled: true, start: "08:00", end: "20:00" };
describe("Service hours", () => {
  it("includes 08:00 and daytime inside 08:00–20:00", () => {
    expect(isWithinServiceHours(hours, at(8))).toBe(true);
    expect(isWithinServiceHours(hours, at(12))).toBe(true);
  });
  it("excludes times before 08:00 and at/after 20:00", () => {
    expect(isWithinServiceHours(hours, at(7, 59))).toBe(false);
    expect(isWithinServiceHours(hours, at(20))).toBe(false);
  });
  it("handles an overnight 20:00–08:00 interval", () => {
    const overnight = { enabled: true, start: "20:00", end: "08:00" };
    expect(isWithinServiceHours(overnight, at(23))).toBe(true);
    expect(isWithinServiceHours(overnight, at(2))).toBe(true);
    expect(isWithinServiceHours(overnight, at(12))).toBe(false);
    expect(isWithinServiceHours(overnight, at(8))).toBe(false);
  });
  it("does not restrict disabled or absent settings", () => {
    expect(isWithinServiceHours({ ...hours, enabled: false }, at(23))).toBe(true);
    expect(isWithinServiceHours(undefined, at(23))).toBe(true);
  });
  it("treats equal endpoints as a full-day overnight interval", () => {
    expect(isWithinServiceHours({ ...hours, end: "08:00" }, at(4))).toBe(true);
    expect(isWithinServiceHours({ ...hours, end: "08:00" }, at(18))).toBe(true);
  });
  it("preserves saved hours when normalizing the hotel profile", () => {
    expect(normalizeHotelProfile({ service_hours: hours }).service_hours).toEqual(hours);
    expect(normalizeHotelProfile({}).service_hours).toEqual({ enabled: false, start: "08:00", end: "20:00" });
  });
  it("only adds concierge service-hour context for enabled settings", () => {
    expect(buildHotelContext({ service_hours: hours }, false)).toContain("dalle 08:00 alle 20:00");
    expect(buildHotelContext({ service_hours: { ...hours, enabled: false } }, false)).not.toContain("Il personale gestisce");
  });
});