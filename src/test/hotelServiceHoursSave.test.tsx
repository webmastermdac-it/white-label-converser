import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const state = vi.hoisted(() => ({
  profile: { property: { name: "Hotel" }, rooms: [{ name: "Suite" }], custom_key: "preserve" } as Record<string, unknown>,
  update: vi.fn(),
}));
vi.mock("@/hooks/useActiveModule", () => ({ useActiveModule: () => ({ botId: "hotel-1" }) }));
vi.mock("@/hooks/usePlanConfig", () => ({ usePlanConfig: () => ({ canUseConciergeRequests: true, loading: false }) }));
vi.mock("@/hooks/useLanguage", () => ({ useLanguage: () => ({ lang: "it" }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => {
    const query = {
      select: () => query, eq: () => query,
      maybeSingle: () => Promise.resolve({ data: { hotel_profile: state.profile }, error: null }),
      order: () => Promise.resolve({ data: [], error: null }),
      update: (payload: { hotel_profile: Record<string, unknown> }) => {
        state.update(payload); state.profile = payload.hotel_profile;
        return { eq: () => Promise.resolve({ error: null }) };
      },
    };
    return query;
  },
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
} }));

import HotelRequests from "@/pages/client/hotel/HotelRequests";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("saves staffing hours while retaining the latest other profile keys", async () => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  render(<MemoryRouter><HotelRequests /></MemoryRouter>);
  const save = await screen.findByRole("button", { name: "Salva" });
  await waitFor(() => expect(save).toBeEnabled());
  fireEvent.click(screen.getByRole("switch", { name: "Orario di presidio" }));
  fireEvent.change(screen.getByLabelText("Dalle"), { target: { value: "22:00" } });
  fireEvent.change(screen.getByLabelText("Alle"), { target: { value: "06:00" } });
  state.profile.latest_key = "changed after loading";
  fireEvent.click(save);
  await waitFor(() => expect(state.update).toHaveBeenCalledWith({ hotel_profile: {
    property: { name: "Hotel" }, rooms: [{ name: "Suite" }], custom_key: "preserve", latest_key: "changed after loading",
    service_hours: { enabled: true, start: "22:00", end: "06:00" },
  } }));
});