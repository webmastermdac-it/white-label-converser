import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { BOT_ID } = vi.hoisted(() => ({ BOT_ID: "11111111-1111-4111-8111-111111111111" }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { hotel_profile: { property: { name: "Hotel Demo" } }, site_url: "", embed_token: "" } }),
        }),
      }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ clientId: "client-1" }) }));
vi.mock("@/hooks/useActiveModule", () => ({ useActiveModule: () => ({ botId: BOT_ID }) }));
vi.mock("@/hooks/usePlanConfig", () => ({ usePlanConfig: () => ({ canUseConciergeRequests: false }) }));
vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({ lang: "it", contentLang: "it", setLang: () => {}, t: (s: string) => s, localized: (v: any) => v.it }),
  tx: (_en: string, it: string, vars?: unknown[]) => (vars ? it.replace(/\{(\d+)\}/g, (_m, i) => String(vars[Number(i)])) : it), appLocale: () => "it-IT", getAppLang: () => "it",
}));

import HotelProfile from "@/pages/client/hotel/HotelProfile";

const backLink = async () => screen.findByRole("link", { name: /Torna al chatbot/i });

describe("Hotel profile back link", () => {
  it("points to the current bot settings on the client side", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/hotel/profile"]}>
        <HotelProfile />
      </MemoryRouter>,
    );
    const link = await backLink();
    expect(link).toHaveAttribute("href", `/dashboard/bots/${BOT_ID}`);
    expect(link.getAttribute("href")).not.toContain("section");
  });

  it("points to the admin bot settings when opened from /admin", async () => {
    render(
      <MemoryRouter initialEntries={[`/admin/bots/${BOT_ID}`]}>
        <HotelProfile botIdOverride={BOT_ID} />
      </MemoryRouter>,
    );
    const link = await backLink();
    expect(link).toHaveAttribute("href", `/admin/bots/${BOT_ID}`);
  });
});
