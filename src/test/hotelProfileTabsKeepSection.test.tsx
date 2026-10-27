import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { MemoryRouter, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Same handler used by HotelProfile: switching tab must not drop the parent's ?section=
const Probe = () => {
  const [params, setParams] = useSearchParams();
  return <>
    <Tabs value={params.get("tab") || "property"} onValueChange={(tab) => setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "property") next.delete("tab"); else next.set("tab", tab);
      return next;
    })}><TabsList><TabsTrigger value="property">P</TabsTrigger><TabsTrigger value="rooms">R</TabsTrigger></TabsList></Tabs>
    <output data-testid="q">{params.toString()}</output>
  </>;
};

describe("hotel profile tabs", () => {
  it("keeps section when changing tab", () => {
    render(<MemoryRouter initialEntries={["/x?section=concierge-profile"]}><Probe /></MemoryRouter>);
    fireEvent.mouseDown(screen.getByText("R"), { button: 0 });
    expect(screen.getByTestId("q").textContent).toBe("section=concierge-profile&tab=rooms");
    fireEvent.mouseDown(screen.getByText("P"), { button: 0 });
    expect(screen.getByTestId("q").textContent).toBe("section=concierge-profile");
  });
});
