import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({ cb: null as null | ((locked: boolean) => void), playNotice: vi.fn() }));
vi.mock("@/hooks/useLanguage", () => ({ tx: (_en: string, it: string) => it }));
vi.mock("@/lib/playNotice", () => ({
  playNotice: state.playNotice,
  subscribeAudioLock: (cb: (locked: boolean) => void) => { state.cb = cb; cb(true); return () => { state.cb = null; }; },
}));
import EnableSoundPrompt from "@/components/hotel/EnableSoundPrompt";

afterEach(() => { cleanup(); state.playNotice.mockClear(); });

describe("EnableSoundPrompt", () => {
  it("shows the button while audio is blocked and plays a test sound on click", () => {
    render(<EnableSoundPrompt visible />);
    fireEvent.click(screen.getByRole("button", { name: /Attiva il suono delle richieste/ }));
    expect(state.playNotice).toHaveBeenCalledTimes(1);
  });
  it("disappears once the browser unlocks audio", () => {
    render(<EnableSoundPrompt visible />);
    act(() => state.cb?.(false));
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("stays hidden when the sound is off or the hotel module is not active", () => {
    render(<EnableSoundPrompt visible={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
