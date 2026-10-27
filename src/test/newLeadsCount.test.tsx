import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rows: [] as { source?: string | null; booking?: { check_in?: string } | null }[], handler: null as null | (() => void) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ clientId: "c1" }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => { const q: any = { select: () => q, eq: () => q, limit: () => Promise.resolve({ data: state.rows, error: null }) }; return q; },
    channel: () => { const ch: any = { on: (_t: string, _o: unknown, cb: () => void) => { state.handler = cb; return ch; }, subscribe: () => ch }; return ch; },
    removeChannel: vi.fn(),
  },
}));
import { useNewLeadsCount, notifyLeadsChanged } from "@/hooks/useNewLeadsCount";

afterEach(cleanup);
describe("useNewLeadsCount", () => {
  it("counts leads to handle and stay requests, and refreshes on changes", async () => {
    state.rows = [{ source: null }, { source: "hotel_quote" }, { booking: { check_in: "2026-11-05" } }];
    const { result } = renderHook(() => useNewLeadsCount());
    await waitFor(() => expect(result.current).toEqual({ count: 3, stay: 2 }));
    state.rows = [{ source: null }];
    act(() => notifyLeadsChanged());
    await waitFor(() => expect(result.current).toEqual({ count: 1, stay: 0 }));
    state.rows = [];
    act(() => state.handler?.());
    await waitFor(() => expect(result.current.count).toBe(0));
  });
});
