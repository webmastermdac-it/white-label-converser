import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const state = vi.hoisted(() => ({
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  updateError: null as null | { message: string },
}));
vi.mock("sonner", () => ({ toast: { success: state.toastSuccess, error: state.toastError } }));
vi.mock("@/hooks/useLanguage", () => ({ tx: (_en: string, it: string) => it }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => table === "service_request_messages"
      ? {
        insert: (v: Record<string, unknown>) => {
          state.insert(v);
          return { select: () => ({ single: () => Promise.resolve({ data: { id: "m1", request_id: v.request_id, author: "staff", body: v.body, closes_request: v.closes_request, created_at: "2026-10-28T10:00:00.000Z" }, error: null }) }) };
        },
      }
      : {
        update: (v: unknown) => { state.update(v); return { eq: (...a: unknown[]) => { state.eq(...a); return Promise.resolve({ error: state.updateError }); } }; },
      },
  },
}));
import RequestReply, { type ThreadMessage } from "@/components/hotel/RequestReply";

const request = { id: "r1", bot_id: "b1", client_id: "c1", status: "open" };
const input = () => screen.getByLabelText("Risposta all'ospite");

afterEach(() => {
  cleanup();
  state.insert.mockClear(); state.update.mockClear(); state.eq.mockClear();
  state.toastError.mockClear(); state.toastSuccess.mockClear();
  state.updateError = null;
});

describe("RequestReply", () => {
  it("adds a staff message to the thread and keeps the latest reply on the request", async () => {
    const onSent = vi.fn();
    render(<RequestReply request={request} messages={[]} onSent={onSent} />);
    fireEvent.change(input(), { target: { value: "Arriviamo subito" } });
    fireEvent.click(screen.getByRole("button", { name: /Invia/ }));
    await waitFor(() => expect(onSent).toHaveBeenCalled());
    expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({ request_id: "r1", bot_id: "b1", client_id: "c1", author: "staff", body: "Arriviamo subito", closes_request: false }));
    expect(state.update).toHaveBeenCalledWith({ staff_reply: "Arriviamo subito", replied_at: "2026-10-28T10:00:00.000Z" });
    expect(state.eq).toHaveBeenCalledWith("id", "r1");
    expect(onSent).toHaveBeenCalledWith(expect.objectContaining({ id: "m1" }), { staff_reply: "Arriviamo subito", replied_at: "2026-10-28T10:00:00.000Z" });
  });

  it("Rispondi e chiudi sends the reply and completes the request", async () => {
    const onSent = vi.fn();
    render(<RequestReply request={request} messages={[]} onSent={onSent} />);
    fireEvent.change(input(), { target: { value: "Fatto, buona serata" } });
    fireEvent.click(screen.getByRole("button", { name: /Rispondi e chiudi/ }));
    await waitFor(() => expect(onSent).toHaveBeenCalled());
    expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({ closes_request: true }));
    expect(state.update).toHaveBeenCalledWith({ staff_reply: "Fatto, buona serata", replied_at: "2026-10-28T10:00:00.000Z", status: "done", resolved_at: "2026-10-28T10:00:00.000Z" });
    expect(onSent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: "done" }));
  });

  it("does not send an empty reply", () => {
    render(<RequestReply request={request} messages={[]} onSent={vi.fn()} />);
    expect((screen.getByRole("button", { name: /Invia/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Rispondi e chiudi/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the whole thread, guest follow-ups included", () => {
    const messages: ThreadMessage[] = [
      { id: "a", request_id: "r1", author: "staff", body: "Le portiamo gli asciugamani", closes_request: false, created_at: "2026-10-28T09:00:00.000Z" },
      { id: "b", request_id: "r1", author: "guest", body: "Ne servono due in più", closes_request: false, created_at: "2026-10-28T09:05:00.000Z" },
    ];
    render(<RequestReply request={request} messages={messages} onSent={vi.fn()} />);
    expect(screen.getByText("Le portiamo gli asciugamani")).toBeTruthy();
    expect(screen.getByText("Ne servono due in più")).toBeTruthy();
    expect(screen.getAllByText(/Ospite/).length).toBeGreaterThan(0);
  });

  it("offers only a plain reply on a request that is already done", () => {
    render(<RequestReply request={{ ...request, status: "done" }} messages={[]} onSent={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Rispondi e chiudi/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Invia/ })).toBeTruthy();
  });

  it("keeps the saved message and warns when the request state cannot be updated", async () => {
    state.updateError = { message: "boom" };
    const onSent = vi.fn();
    render(<RequestReply request={request} messages={[]} onSent={onSent} />);
    fireEvent.change(input(), { target: { value: "Ok" } });
    fireEvent.click(screen.getByRole("button", { name: /Rispondi e chiudi/ }));
    await waitFor(() => expect(onSent).toHaveBeenCalled());
    expect(onSent).toHaveBeenCalledWith(expect.anything(), { staff_reply: "Ok", replied_at: "2026-10-28T10:00:00.000Z" });
    expect(state.toastError).toHaveBeenCalled();
  });
});
