import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const state = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/useLanguage", () => ({ tx: (_en: string, it: string) => it }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ update: (v: unknown) => { state.update(v); return { eq: (...a: unknown[]) => { state.eq(...a); return Promise.resolve({ error: null }); } }; } }) },
}));
import RequestReply from "@/components/hotel/RequestReply";

afterEach(() => { cleanup(); state.update.mockClear(); state.eq.mockClear(); });

describe("RequestReply", () => {
  it("saves the reply on the request and reports it", async () => {
    const onSaved = vi.fn();
    render(<RequestReply requestId="r1" reply={null} repliedAt={null} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Risposta all'ospite"), { target: { value: "Arriviamo subito" } });
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("Arriviamo subito", expect.any(String)));
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ staff_reply: "Arriviamo subito" }));
    expect(state.eq).toHaveBeenCalledWith("id", "r1");
  });
  it("does not send an empty reply", () => {
    render(<RequestReply requestId="r1" reply={null} repliedAt={null} onSaved={vi.fn()} />);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });
  it("shows an existing reply", () => {
    render(<RequestReply requestId="r1" reply="Ok" repliedAt={null} onSaved={vi.fn()} />);
    expect(screen.getByText("Ok")).toBeTruthy();
  });
});
