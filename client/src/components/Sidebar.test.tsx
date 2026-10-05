import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import type { FacetCount } from "../api/types";
import { Sidebar } from "./Sidebar";


type Facets = ComponentProps<typeof Sidebar>["facets"];

const result = (data: FacetCount[], isFetching: boolean) => ({
  data,
  isFetching,
  isPending: false,
  isError: false,
  refetch: () => {},
});
const facets = (nationalities: FacetCount[], hobbies: FacetCount[], isFetching = false) =>
  ({ nationalities: result(nationalities, isFetching), hobbies: result(hobbies, isFetching) }) as unknown as Facets;

const nationalities: FacetCount[] = [{ value: "Brazil", count: 30 }];
const hobbies: FacetCount[] = [
  { value: "Hiking", count: 40 },
  { value: "Yoga", count: 25 },
];

function renderSidebar(f: Facets) {
  return (
    <Sidebar
      facets={f}
      selection={{ nationalities: [], hobbies: [] }}
      onToggleNationality={() => {}}
      onToggleHobby={() => {}}
    />
  );
}

describe("Sidebar scroll anchoring", () => {
  it("turns off the browser's own scroll anchoring so only one thing adjusts the scroll", () => {
    render(renderSidebar(facets(nationalities, hobbies)));
    expect(screen.getByRole("complementary", { name: "Filters" }).className).toContain("[overflow-anchor:none]");
  });

  it("scrolls to keep a clicked hobby in place when the lists change under it", () => {
    const view = render(renderSidebar(facets(nationalities, hobbies)));
    const aside = screen.getByRole("complementary", { name: "Filters" });
    const row = screen.getByRole("checkbox", { name: /Hiking/ }).closest("label")!;

    let scrollTop = 300;
    Object.defineProperty(aside, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });
    let rowTop = 400;
    aside.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
    row.getBoundingClientRect = () => ({ top: rowTop }) as DOMRect;

    fireEvent.click(screen.getByRole("checkbox", { name: /Hiking/ }));

    rowTop = 280;
    view.rerender(renderSidebar(facets(nationalities, [...hobbies], true)));

    expect(scrollTop).toBe(180);
  });
});
