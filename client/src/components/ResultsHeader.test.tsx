import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultsHeader } from "./ResultsHeader";

const props = { total: 5000, loaded: 60, sort: "first_name", dir: "asc" } as const;

describe("ResultsHeader", () => {
  it("shows the total as a heading, with thousands separators", () => {
    render(<ResultsHeader {...props} />);
    expect(screen.getByRole("heading", { level: 2, name: "5,000 users" })).toBeInTheDocument();
  });

  it("says '1 user' for a single match", () => {
    render(<ResultsHeader {...props} total={1} loaded={1} />);
    expect(screen.getByRole("heading", { level: 2, name: "1 user" })).toBeInTheDocument();
  });

  it("shows 0 users when nothing matches", () => {
    render(<ResultsHeader {...props} total={0} loaded={0} />);
    expect(screen.getByRole("heading", { level: 2, name: "0 users" })).toBeInTheDocument();
  });

  it("says Loading… until the first page arrives, and no count line yet", () => {
    render(<ResultsHeader {...props} total={undefined} loaded={0} />);
    expect(screen.getByRole("heading", { level: 2, name: "Loading…" })).toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("shows how many are loaded so far, out of the total", () => {
    render(<ResultsHeader {...props} />);
    expect(screen.getByText(/Showing 60 of 5,000/)).toBeInTheDocument();
  });

  it("adds how it is sorted, which is the part a phone leaves out for room", () => {
    render(<ResultsHeader {...props} sort="age" dir="desc" />);
    const line = screen.getByText(/Showing 60 of 5,000/);
    expect(line).toHaveTextContent("Showing 60 of 5,000 · sorted by age, High–Low");
    expect(line.querySelector("span")).toHaveClass("hidden", "lg:inline");
  });

  it("keeps the heading on phones too: it is never hidden below the desktop breakpoint", () => {
    render(<ResultsHeader {...props} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).not.toHaveClass("hidden");
    expect(heading).toHaveClass("text-[20px]", "lg:text-[24px]");
  });

  it("announces count changes politely as more pages load", () => {
    const { rerender } = render(<ResultsHeader {...props} />);
    const region = document.querySelector("[aria-live='polite']");
    expect(region).toHaveTextContent("Showing 60 of 5,000");

    rerender(<ResultsHeader {...props} loaded={90} />);
    expect(document.querySelector("[aria-live='polite']")).toBe(region);
    expect(region).toHaveTextContent("Showing 90 of 5,000");
  });
});
