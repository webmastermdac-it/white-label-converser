import { describe, expect, it } from "vitest";
import { isNewStayEvent } from "@/hooks/useNewLeadAlerts";
import { isEmail, replyMailto, telHref } from "@/lib/leadReply";
import { isStayRequest, stayLine } from "@/lib/leadStay";

const booking = { check_in: "2026-11-05", check_out: "2026-11-10", adults: 2, children: 1, room_name: "Suite" };

describe("stay request alerts", () => {
  it("alerts when stay data is added to an existing lead or re-sent, not on unrelated updates", () => {
    expect(isNewStayEvent({ booking: { ...booking, sends: 1 } }, { booking: null })).toBe(true);
    expect(isNewStayEvent({ booking: { ...booking, sends: 2 } }, { booking: { ...booking, sends: 1 } })).toBe(true);
    expect(isNewStayEvent({ booking: { ...booking, sends: 1 } }, { booking: { ...booking, sends: 1 } })).toBe(false);
    expect(isNewStayEvent({ booking: null }, { booking: null })).toBe(false);
  });
  it("recognises stay requests and summarises them", () => {
    expect(isStayRequest({ booking })).toBe(true);
    expect(isStayRequest({ source: "hotel_quote" })).toBe(true);
    expect(isStayRequest({ booking: null })).toBe(false);
    expect(stayLine(booking)).toContain("05/11/2026 → 10/11/2026");
  });
});

describe("reply links", () => {
  it("builds a mailto in the guest's language and rejects invalid addresses", () => {
    const url = replyMailto({ name: "Anna", email: "anna@example.com", language: "de-DE", booking });
    expect(url.startsWith("mailto:anna@example.com?subject=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Guten Tag Anna");
    expect(decodeURIComponent(url)).toContain("05/11/2026");
    expect(replyMailto({ name: "X", email: "not-an-email" })).toBe("");
    expect(isEmail("a@b.co")).toBe(true);
  });
  it("cleans phone numbers for tel: and ignores junk", () => {
    expect(telHref("+39 345 123 4567")).toBe("tel:+393451234567");
    expect(telHref("(030) 123-456")).toBe("tel:030123456");
    expect(telHref("n/d")).toBe("");
    expect(telHref("")).toBe("");
  });
});
