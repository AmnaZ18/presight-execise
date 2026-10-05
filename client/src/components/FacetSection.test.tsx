import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FacetCount } from "../api/types";
import { FacetSection, barPercent, COLLAPSED_COUNT } from "./FacetSection";


const items: FacetCount[] = Array.from({ length: 12 }, (_, i) => ({
  value: `Item${String(i + 1).padStart(2, "0")}`,
  count: (12 - i) * 10,
}));

const props = {
  title: "Hobbies",
  hint: "Top 20 · match all",
  items,
  selected: [] as string[],
  onToggle: () => {},
  isLoading: false,
  isError: false,
  onRetry: () => {},
};

describe("barPercent", () => {
  it("scales a count against the biggest one, capped at 100", () => {
    expect(barPercent(50, 100)).toBe(50);
    expect(barPercent(100, 100)).toBe(100);
    expect(barPercent(214, 71)).toBe(100); 
  });

  it("is 0 when there is nothing to scale against", () => {
    expect(barPercent(5, 0)).toBe(0);
  });
});

describe("FacetSection", () => {
  it("shows each value with its count", () => {
    render(<FacetSection {...props} />);
    expect(screen.getByRole("checkbox", { name: /Item01/ })).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("collapses to the first 8 rows, and 'Show all' reveals the rest and 'Show less' hides them again", async () => {
    const user = userEvent.setup();
    render(<FacetSection {...props} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(COLLAPSED_COUNT);

    await user.click(screen.getByRole("button", { name: "Show all 12" }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(12);

    await user.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(COLLAPSED_COUNT);
  });

  it("never hides a selected value behind 'Show all', even one ranked beyond the first 8", () => {
    render(<FacetSection {...props} selected={["Item12"]} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(COLLAPSED_COUNT + 1);
    expect(screen.getByRole("checkbox", { name: /Item12/ })).toBeChecked();
  });

  it("matches selected values case-insensitively", () => {
    render(<FacetSection {...props} selected={["item02"]} />);
    expect(screen.getByRole("checkbox", { name: /Item02/ })).toBeChecked();
  });

  it("reports the value when a checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<FacetSection {...props} onToggle={onToggle} />);
    await user.click(screen.getByRole("checkbox", { name: /Item03/ }));
    expect(onToggle).toHaveBeenCalledWith("Item03");
  });

  it("has no 'Show all' button when everything already fits", () => {
    render(<FacetSection {...props} items={items.slice(0, 5)} />);
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
  });

  it("the sheet variant always lists everything, with no collapse button and no bars", () => {
    render(<FacetSection {...props} variant="sheet" />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(12);
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
  });

  it("shows a loading state instead of rows while loading", () => {
    render(<FacetSection {...props} isLoading />);
    expect(screen.getByRole("status", { name: /loading hobbies/i })).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("shows an error with a working Retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<FacetSection {...props} isError onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load hobbies/i);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("says so when there are no options", () => {
    render(<FacetSection {...props} items={[]} />);
    expect(screen.getByText(/no options/i)).toBeInTheDocument();
  });
});

describe("FacetSection: selected count label", () => {
  const countLabel = () => screen.queryByText(/^\d+ selected$/);

  it("shows nothing while no value is selected", () => {
    render(<FacetSection {...props} showSelectedCount />);
    expect(countLabel()).not.toBeInTheDocument();
  });

  it("says how many are selected, under the heading", () => {
    render(<FacetSection {...props} showSelectedCount selected={["Item01", "Item02"]} />);
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    const headingRow = screen.getByRole("heading", { name: "Hobbies" }).parentElement!;
    expect(headingRow.nextElementSibling).toHaveTextContent("2 selected");
  });

  it("counts a single selection too", () => {
    render(<FacetSection {...props} showSelectedCount selected={["Item05"]} />);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("counts selected values that are hidden behind 'Show all' as well", () => {
    render(<FacetSection {...props} showSelectedCount selected={["Item01", "Item12"]} />);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("follows the selection as it changes, and goes away at zero", () => {
    const { rerender } = render(<FacetSection {...props} showSelectedCount selected={["Item01"]} />);
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    rerender(<FacetSection {...props} showSelectedCount selected={["Item01", "Item02", "Item03"]} />);
    expect(screen.getByText("3 selected")).toBeInTheDocument();

    rerender(<FacetSection {...props} showSelectedCount selected={[]} />);
    expect(countLabel()).not.toBeInTheDocument();
  });

  it("is off unless a section asks for it, even with values selected", () => {
    render(<FacetSection {...props} selected={["Item01", "Item02"]} />);
    expect(countLabel()).not.toBeInTheDocument();
    expect(document.querySelector("[aria-live]")).toBeNull();
  });

  it("also shows in the mobile sheet's version of the list", () => {
    render(<FacetSection {...props} variant="sheet" showSelectedCount selected={["Item01", "Item02"]} />);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("keeps a polite live region in the page even when empty, so changes get announced", () => {
    const { rerender } = render(<FacetSection {...props} showSelectedCount />);
    const region = document.querySelector("[aria-live='polite']");
    expect(region).not.toBeNull();
    expect(region).toHaveTextContent("");

    rerender(<FacetSection {...props} showSelectedCount selected={["Item01"]} />);
    expect(document.querySelector("[aria-live='polite']")).toBe(region);
    expect(region).toHaveTextContent("1 selected");
  });

  it("is styled like the 'Top 20 · match all' hint beside the heading", () => {
    render(<FacetSection {...props} showSelectedCount selected={["Item01"]} />);
    const hint = screen.getByText("Top 20 · match all");
    const label = screen.getByText("1 selected");
    for (const cls of ["text-[11px]", "text-muted"]) {
      expect(hint).toHaveClass(cls);
      expect(label).toHaveClass(cls);
    }
  });
});
