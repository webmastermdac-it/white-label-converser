import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: [] as { id: string; category: string }[],
  handlers: {} as Record<string, () => void>,
  module: "hotel",
  allowed: true,
  playNotice: vi.fn(),
}));
vi.mock("@/hooks/useActiveModule", () => ({ useActiveModule: () => ({ botId: "hotel-1", module: { id: state.module } }) }));
vi.mock("@/hooks/usePlanConfig", () => ({ usePlanConfig: () => ({ canUseConciergeRequests: state.allowed }) }));
vi.mock("@/hooks/useLanguage", () => ({ useLanguage: () => ({ lang: "it" }) }));
vi.mock("@/lib/playNotice", () => ({ playNotice: state.playNotice, SERVICE_REQUEST_SOUND_KEY: "test-sound" }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const query = {
        select: vi.fn(() => query), eq: vi.fn(() => query), order: vi.fn(() => query),
        range: (start: number, end: number) => Promise.resolve({ data: state.rows.slice(start, end + 1), error: null }),
      };
      return query;
    },
    channel: () => {
      const channel = {
        on: (_type: string, options: { event: string }, callback: () => void) => { state.handlers[options.event] = callback; return channel; },
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: vi.fn(),
  },
}));

import { useOpenServiceRequests } from "@/hooks/useOpenServiceRequests";
import RequestAlertLamp, { SERVICE_REQUEST_LAMP_KEY, useRequestLampPreference } from "@/components/hotel/RequestAlertLamp";

let observed: { count: number; urgent: boolean; enabled: boolean };
function LampHarness() {
  const { count, urgent, enabled } = useOpenServiceRequests();
  observed = { count, urgent, enabled };
  const { lampEnabled } = useRequestLampPreference();
  return <MemoryRouter><RequestAlertLamp count={count} urgent={urgent} visible={enabled && lampEnabled && count > 0} /></MemoryRouter>;
}

beforeEach(() => {
  localStorage.clear(); state.rows = []; state.handlers = {}; state.module = "hotel"; state.allowed = true; state.playNotice.mockClear();
});
afterEach(cleanup);

describe("Hotel request lamp", () => {
  it("changes from ordinary to urgent for Problema in camera and switches off at zero", async () => {
    state.rows = [{ id: "1", category: "Asciugamani" }];
    render(<LampHarness />);
    await waitFor(() => expect(observed).toMatchObject({ count: 1, urgent: false }));
    await screen.findByRole("status");
    state.rows.push({ id: "2", category: "Problema in camera" });
    act(() => state.handlers.INSERT());
    await waitFor(() => expect(observed).toMatchObject({ count: 2, urgent: true }));
    expect(await screen.findByRole("status")).toBeInTheDocument();
    state.rows = [];
    act(() => state.handlers.UPDATE());
    await waitFor(() => expect(observed).toMatchObject({ count: 0, urgent: false }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("defaults on and immediately persists switching off", () => {
    const { result } = renderHook(useRequestLampPreference);
    expect(result.current.lampEnabled).toBe(true);
    act(() => result.current.toggleLamp(false));
    expect(result.current.lampEnabled).toBe(false);
    expect(localStorage.getItem(SERVICE_REQUEST_LAMP_KEY)).toBe("false");
  });

  it("does not display the lamp for a non-hotel module", () => {
    state.module = "general"; state.rows = [{ id: "1", category: "Problema in camera" }];
    render(<LampHarness />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not display the lamp if the plan excludes guest requests", () => {
    state.allowed = false; state.rows = [{ id: "1", category: "Problema in camera" }];
    render(<LampHarness />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("finds urgent requests beyond the API's first page", async () => {
    state.rows = Array.from({ length: 1001 }, (_, index) => ({ id: String(index), category: index === 1000 ? "Problema in camera" : "Asciugamani" }));
    const { result } = renderHook(useOpenServiceRequests);
    await waitFor(() => expect(result.current).toMatchObject({ count: 1001, urgent: true }));
  });
});