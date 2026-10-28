import { describe, expect, it } from "vitest";
import { REOPEN_WINDOW_MS, buildActiveRequestContext, canFollowUp } from "../../supabase/functions/_shared/requestThread";

const now = Date.parse("2026-10-28T12:00:00Z");
const closedAgo = (ms: number) => new Date(now - ms).toISOString();
const base = { category: "Pulizia/asciugamani", message: "[chat] Servono asciugamani", created_at: closedAgo(5 * 3600 * 1000) };

describe("canFollowUp", () => {
  it("always accepts follow-ups on open and in-progress requests", () => {
    expect(canFollowUp({ ...base, status: "open", resolved_at: null }, now)).toBe(true);
    expect(canFollowUp({ ...base, status: "in_progress", resolved_at: null }, now)).toBe(true);
  });
  it("reopens a request closed less than 24 hours ago", () => {
    expect(canFollowUp({ ...base, status: "done", resolved_at: closedAgo(REOPEN_WINDOW_MS - 60000) }, now)).toBe(true);
  });
  it("does not reopen a request closed more than 24 hours ago", () => {
    expect(canFollowUp({ ...base, status: "done", resolved_at: closedAgo(REOPEN_WINDOW_MS + 60000) }, now)).toBe(false);
  });
  it("falls back to the creation time when the closing time is missing", () => {
    expect(canFollowUp({ ...base, status: "done", resolved_at: null, created_at: closedAgo(REOPEN_WINDOW_MS + 60000) }, now)).toBe(false);
  });
});

describe("buildActiveRequestContext", () => {
  const request = { ...base, status: "open", resolved_at: null };
  it("describes the request, the thread and the routing rules", () => {
    const text = buildActiveRequestContext(request, [
      { author: "staff", body: "Le portiamo subito", created_at: "2026-10-28T10:00:00Z" },
      { author: "guest", body: "Grazie, ne servono anche due piccoli", created_at: "2026-10-28T10:05:00Z" },
    ]);
    expect(text).toContain("Servono asciugamani");
    expect(text).not.toContain("[chat]");
    expect(text).toContain("Staff (human reception): Le portiamo subito");
    expect(text).toContain("Guest: Grazie, ne servono anche due piccoli");
    expect(text).toContain("[REQUEST_FOLLOWUP:");
    expect(text).toContain("🛎️");
    expect(text).toContain("waiting for the staff");
  });
  it("keeps only the latest messages and clips long ones", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ author: "guest" as const, body: `msg-${i} ` + "x".repeat(500), created_at: "2026-10-28T10:00:00Z" }));
    const text = buildActiveRequestContext(request, many);
    expect(text).not.toContain("msg-3 ");
    expect(text).toContain("msg-11 ");
    expect(text).not.toContain("x".repeat(400));
  });
  it("labels a closed request as completed", () => {
    expect(buildActiveRequestContext({ ...request, status: "done" }, [])).toContain("completed");
  });
});
