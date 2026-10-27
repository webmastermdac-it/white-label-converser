import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ChatMessageText from "@/components/chat/ChatMessageText";

describe("ChatMessageText", () => {
  it("renders bold, links and images, hides internal markers and keeps long URLs short", () => {
    const long = "https://example.com/" + "a".repeat(120);
    const { container } = render(<ChatMessageText content={`Ciao **Piero**!\n- Camera Limonaia\n![Suite](https://x.test/p.jpg)\nVedi ${long}.\n[SERVICE_REQUEST:{"category":"Altro","message":"x"}]`} />);
    expect(screen.getByText("Piero").tagName).toBe("STRONG");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://x.test/p.jpg");
    const link = container.querySelector(`a[href="${long}"]`);
    expect(link?.textContent?.length).toBeLessThanOrEqual(48);
    expect(container.textContent).not.toContain("SERVICE_REQUEST");
    expect(container.textContent).not.toContain("**");
  });
  it("never injects HTML", () => {
    const { container } = render(<ChatMessageText content={'<img src=x onerror=alert(1)><script>1</script>'} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});
