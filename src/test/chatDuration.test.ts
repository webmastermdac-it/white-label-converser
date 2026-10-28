import { describe, expect, it } from "vitest";
import { chatDurationMinutes, formatChatDuration } from "@/lib/chatDuration";

const start = "2026-10-26T15:32:35Z";
const after = (min: number) => new Date(Date.parse(start) + min * 60000).toISOString();

describe("chatDurationMinutes", () => {
  it("returns whole minutes for a normal chat", () => {
    expect(chatDurationMinutes(start, after(12.9))).toBe(12);
    expect(chatDurationMinutes(start, after(180))).toBe(180);
  });
  it("hides spans that include idle time (1441 min, months-long bulk-closed chats)", () => {
    expect(chatDurationMinutes(start, after(1441))).toBeNull();
    expect(chatDurationMinutes(start, after(274407))).toBeNull();
  });
  it("returns null for open chats and invalid dates", () => {
    expect(chatDurationMinutes(start, null)).toBeNull();
    expect(chatDurationMinutes(start, "bad")).toBeNull();
    expect(chatDurationMinutes(after(5), start)).toBeNull();
  });
});

describe("formatChatDuration", () => {
  it("formats minutes, sub-minute and unknown", () => {
    expect(formatChatDuration(12)).toBe("12 min");
    expect(formatChatDuration(0)).toBe("< 1 min");
    expect(formatChatDuration(null)).toBe("–");
  });
});
