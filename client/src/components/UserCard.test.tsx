import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { User } from "../api/types";
import { UserCard } from "./UserCard";

const user = (overrides: Partial<User> = {}): User => ({
  id: 1,
  avatar: "purple",
  first_name: "Kenta",
  last_name: "Ando",
  age: 34,
  nationality: "Japan",
  hobbies: [],
  ...overrides,
});

const hobbyChips = () => {
  const list = screen.queryByRole("list", { name: "Hobbies" });
  return list ? within(list).getAllByRole("listitem").map((li) => li.textContent) : [];
};

describe("UserCard", () => {
  it("shows the name, nationality, age and initials", () => {
    render(<UserCard user={user()} />);
    expect(screen.getByRole("heading", { name: "Kenta Ando" })).toBeInTheDocument();
    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getByText("KA")).toBeInTheDocument();
  });

  it("shows no hobby list at all for a user with no hobbies", () => {
    render(<UserCard user={user({ hobbies: [] })} />);
    expect(screen.queryByRole("list", { name: "Hobbies" })).not.toBeInTheDocument();
  });

  it("shows one hobby with no +n", () => {
    render(<UserCard user={user({ hobbies: ["Hiking"] })} />);
    expect(hobbyChips()).toEqual(["Hiking"]);
  });

  it("shows exactly two hobbies with no +n", () => {
    render(<UserCard user={user({ hobbies: ["Hiking", "Yoga"] })} />);
    expect(hobbyChips()).toEqual(["Hiking", "Yoga"]);
  });

  it("shows the first two hobbies and +1 for a third", () => {
    render(<UserCard user={user({ hobbies: ["Hiking", "Yoga", "Chess"] })} />);
    expect(hobbyChips()).toEqual(["Hiking", "Yoga", "+1"]);
  });

  it("shows +8 for a user with the maximum of 10 hobbies", () => {
    const hobbies = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    render(<UserCard user={user({ hobbies })} />);
    expect(hobbyChips()).toEqual(["A", "B", "+8"]);
    expect(screen.getByLabelText("8 more hobbies")).toBeInTheDocument();
  });

  it("describes a single extra hobby in the singular for screen readers", () => {
    render(<UserCard user={user({ hobbies: ["Hiking", "Yoga", "Chess"] })} />);
    expect(screen.getByLabelText("1 more hobby")).toBeInTheDocument();
  });
});

describe("UserCard: highlighting the hobbies you filtered by", () => {
  const hobbies = ["Hiking", "Yoga", "Chess", "Dancing"];
  const outlined = (el: HTMLElement) => el.classList.contains("ring-accent");

  it("outlines a visible hobby that is in the filter, and only that one", () => {
    render(<UserCard user={user({ hobbies })} highlight={["Yoga"]} />);
    const list = screen.getByRole("list", { name: "Hobbies" });
    expect(outlined(within(list).getByText("Yoga", { exact: false }).closest("li")!)).toBe(true);
    expect(outlined(within(list).getByText("Hiking").closest("li")!)).toBe(false);
  });

  it("outlines every selected hobby when several are selected", () => {
    render(<UserCard user={user({ hobbies })} highlight={["Hiking", "Yoga"]} />);
    const list = screen.getByRole("list", { name: "Hobbies" });
    const chips = within(list).getAllByRole("listitem").slice(0, 2);
    expect(chips.map(outlined)).toEqual([true, true]);
  });

  it("says so to a screen reader too, not just with the outline", () => {
    render(<UserCard user={user({ hobbies })} highlight={["Hiking"]} />);
    expect(screen.getByText("(matches your filter)")).toBeInTheDocument();
  });

  it("outlines nothing when no hobby is selected", () => {
    render(<UserCard user={user({ hobbies })} />);
    expect(document.querySelector(".ring-accent")).toBeNull();
    expect(screen.queryByText("(matches your filter)")).not.toBeInTheDocument();
  });

  it("ignores selected hobbies this person doesn't have", () => {
    render(<UserCard user={user({ hobbies })} highlight={["Surfing"]} />);
    expect(document.querySelector(".ring-accent")).toBeNull();
  });

  it("outlines a matching hobby in the hover tooltip, and leaves the others plain", async () => {
    const mouse = userEvent.setup();
    render(<UserCard user={user({ hobbies })} highlight={["Chess"]} />);

    await mouse.hover(screen.getByLabelText(/^2 more hobbies/));
    const tooltip = await screen.findByRole("tooltip");

    const [chess, dancing] = within(tooltip).getAllByRole("listitem");
    expect(chess).toHaveTextContent("Chess");
    expect(outlined(chess)).toBe(true);
    expect(outlined(dancing)).toBe(false);
  });

  describe("the +n chip", () => {
    const plusN = (name: string | RegExp) => screen.getByLabelText(name);

    it("is outlined when a selected hobby is hidden inside it", () => {
      render(<UserCard user={user({ hobbies })} highlight={["Chess"]} />);
      expect(outlined(plusN(/^2 more hobbies/))).toBe(true);
    });

    it("is outlined when any one of several selected hobbies is hidden inside it", () => {
      render(<UserCard user={user({ hobbies })} highlight={["Hiking", "Dancing"]} />);
      expect(outlined(plusN(/^2 more hobbies/))).toBe(true);
    });

    it("stays plain when the selected hobby is already visible on the card", () => {
      render(<UserCard user={user({ hobbies })} highlight={["Hiking"]} />);
      expect(outlined(plusN("2 more hobbies"))).toBe(false);
    });

    it("stays plain when nothing is selected, or the selected hobby isn't this person's", () => {
      const { rerender } = render(<UserCard user={user({ hobbies })} />);
      expect(outlined(plusN("2 more hobbies"))).toBe(false);

      rerender(<UserCard user={user({ hobbies })} highlight={["Surfing"]} />);
      expect(outlined(plusN("2 more hobbies"))).toBe(false);
    });

    it("tells a screen reader how many of the hidden hobbies match", () => {
      const { rerender } = render(<UserCard user={user({ hobbies })} highlight={["Chess"]} />);
      expect(plusN("2 more hobbies, 1 matches your filter")).toBeInTheDocument();

      rerender(<UserCard user={user({ hobbies })} highlight={["Chess", "Dancing"]} />);
      expect(plusN("2 more hobbies, 2 match your filter")).toBeInTheDocument();
    });

    it("keeps the same text, so it still reads +n", () => {
      render(<UserCard user={user({ hobbies })} highlight={["Chess"]} />);
      expect(plusN(/^2 more hobbies/)).toHaveTextContent(/^\+2$/);
    });

    it("looks the same whether or not you are hovering it", async () => {
      const mouse = userEvent.setup();
      render(<UserCard user={user({ hobbies })} highlight={["Chess"]} />);
      const chip = plusN(/^2 more hobbies/);
      const before = chip.className;

      await mouse.hover(chip);
      await screen.findByRole("tooltip");

      expect(chip.className).toBe(before);
    });
  });
});

describe("UserCard: hovering +n", () => {
  const tenHobbies = ["Archery", "Baking", "Chess", "Dancing", "Fishing", "Gaming", "Hiking", "Knitting", "Origami", "Pottery"];
  const chip = () => screen.getByLabelText("8 more hobbies");
  const tooltips = () => screen.queryAllByRole("tooltip");

  it("shows no tooltip until you hover", () => {
    render(<UserCard user={user({ hobbies: tenHobbies })} />);
    expect(tooltips()).toHaveLength(0);
  });

  it("lists exactly the hidden hobbies, with a heading, when you hover", async () => {
    const mouse = userEvent.setup();
    render(<UserCard user={user({ hobbies: tenHobbies })} />);

    await mouse.hover(chip());
    const tooltip = await screen.findByRole("tooltip");

    expect(tooltip).toHaveTextContent("8 more hobbies");
    expect(within(tooltip).getAllByRole("listitem").map((li) => li.textContent)).toEqual(tenHobbies.slice(2));
    // The two hobbies already on the card are not repeated.
    expect(within(tooltip).queryByText("Archery")).not.toBeInTheDocument();
    expect(chip()).toHaveAttribute("aria-describedby", tooltip.id);
  });

  it("uses the singular heading for a single hidden hobby", async () => {
    const mouse = userEvent.setup();
    render(<UserCard user={user({ hobbies: ["Hiking", "Yoga", "Chess"] })} />);
    await mouse.hover(screen.getByLabelText("1 more hobby"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("1 more hobby");
  });

  it("hides when the pointer leaves", async () => {
    const mouse = userEvent.setup();
    render(<UserCard user={user({ hobbies: tenHobbies })} />);

    await mouse.hover(chip());
    await screen.findByRole("tooltip");
    await mouse.unhover(chip());

    await waitFor(() => expect(tooltips()).toHaveLength(0));
  });

  it("does not open on a bare click: hover is the only trigger", () => {
    render(<UserCard user={user({ hobbies: tenHobbies })} />);
    fireEvent.click(chip());
    expect(tooltips()).toHaveLength(0);
  });

  it("leaves the chip's look alone while the tooltip is showing", async () => {
    const mouse = userEvent.setup();
    render(<UserCard user={user({ hobbies: tenHobbies })} />);
    const before = chip().className;

    await mouse.hover(chip());
    await screen.findByRole("tooltip");

    expect(chip().className).toBe(before);
    expect(chip()).toHaveClass("bg-chip");
    expect(chip()).not.toHaveClass("bg-accent");
  });

  it("closes on Escape", async () => {
    const mouse = userEvent.setup();
    render(<UserCard user={user({ hobbies: tenHobbies })} />);

    await mouse.hover(chip());
    await screen.findByRole("tooltip");
    await mouse.keyboard("{Escape}");

    expect(tooltips()).toHaveLength(0);
  });

  it("closes when the page or the list scrolls, since it is placed with fixed coordinates", async () => {
    const mouse = userEvent.setup();
    render(<UserCard user={user({ hobbies: tenHobbies })} />);

    await mouse.hover(chip());
    await screen.findByRole("tooltip");
    fireEvent.scroll(window);

    expect(tooltips()).toHaveLength(0);
  });

  it("shows only one tooltip at a time when moving from one card to another", async () => {
    const mouse = userEvent.setup();
    render(
      <>
        <UserCard user={user({ id: 1, first_name: "Kenta", hobbies: tenHobbies })} />
        <UserCard user={user({ id: 2, first_name: "Ana", hobbies: ["A", "B", "C", "D", "E", "F", "G"] })} />
      </>
    );

    await mouse.hover(screen.getByLabelText("8 more hobbies"));
    await screen.findByRole("tooltip");
    await mouse.hover(screen.getByLabelText("5 more hobbies"));

    await waitFor(() => {
      const open = tooltips();
      expect(open).toHaveLength(1);
      expect(open[0]).toHaveTextContent("5 more hobbies");
    });
  });
});
