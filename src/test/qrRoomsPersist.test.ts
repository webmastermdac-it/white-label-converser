import { describe, expect, it } from "vitest";
import { normalizeHotelProfile } from "@/lib/hotelProfile";

describe("QR rooms persistence", () => {
  it("keeps the saved room list across loads", () => {
    expect(normalizeHotelProfile({ qr_rooms: "101, 102, 103, 104" }).qr_rooms).toBe("101, 102, 103, 104");
  });
  it("defaults to empty (UI shows the 101-120 suggestion)", () => {
    expect(normalizeHotelProfile({}).qr_rooms).toBe("");
  });
});
