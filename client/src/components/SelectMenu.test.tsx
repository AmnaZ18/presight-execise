import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SelectMenu } from "./SelectMenu";

const options = [
  { value: "first", label: "First name" },
  { value: "last", label: "Last name" },
  { value: "age", label: "Age" },
  { value: "nationality", label: "Nationality" },
] as const;

function setup(value: (typeof options)[number]["value"] = "last", hideLabel = false) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(
    <div>
      <SelectMenu label="Sort by" hideLabel={hideLabel} value={value} options={options} onChange={onChange} />
      <button type="button">elsewhere</button>
    </div>
  );
  const combobox = screen.getByRole("combobox", { name: "Sort by" });
  return { user, onChange, combobox };
}

const activeOption = (combobox: HTMLElement) =>
  document.getElementById(combobox.getAttribute("aria-activedescendant") ?? "")?.textContent;

describe("SelectMenu: closed", () => {
  it("shows the selected option's label and keeps the list hidden", () => {
    const { combobox } = setup("last");
    expect(combobox).toHaveTextContent("Last name");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps an accessible name even when the visible label is hidden", () => {
    setup("last", true);
    expect(screen.getByRole("combobox", { name: "Sort by" })).toBeInTheDocument();
  });
});

describe("SelectMenu: mouse", () => {
  it("opens on click and lists every option, marking the selected one", async () => {
    const { user, combobox } = setup("last");
    await user.click(combobox);

    expect(combobox).toHaveAttribute("aria-expanded", "true");
    const list = screen.getByRole("listbox", { name: "Sort by" });
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "First name",
      "Last name",
      "Age",
      "Nationality",
    ]);
    expect(screen.getByRole("option", { name: "Last name" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Age" })).toHaveAttribute("aria-selected", "false");
  });

  it("choosing an option reports it and closes the list", async () => {
    const { user, onChange, combobox } = setup("last");
    await user.click(combobox);
    await user.click(screen.getByRole("option", { name: "Age" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("age");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(combobox).toHaveFocus(); 
  });

  it("clicking the button again closes it without choosing anything", async () => {
    const { user, onChange, combobox } = setup();
    await user.click(combobox);
    await user.click(combobox);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clicking anywhere outside closes it without choosing anything", async () => {
    const { user, onChange, combobox } = setup();
    await user.click(combobox);
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("SelectMenu: keyboard", () => {
  it.each(["{ArrowDown}", "{ArrowUp}", "{Enter}", " "])("%s opens it with the selected option highlighted", async (key) => {
    const { user, combobox } = setup("age");
    combobox.focus();
    await user.keyboard(key);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(activeOption(combobox)).toBe("Age");
  });

  it("Home and End open it on the first and last option", async () => {
    const first = setup("age");
    first.combobox.focus();
    await first.user.keyboard("{Home}");
    expect(activeOption(first.combobox)).toBe("First name");
  });

  it("End opens it on the last option", async () => {
    const { user, combobox } = setup("age");
    combobox.focus();
    await user.keyboard("{End}");
    expect(activeOption(combobox)).toBe("Nationality");
  });

  it("arrows move the highlight and stop at the ends instead of wrapping", async () => {
    const { user, combobox } = setup("last");
    combobox.focus();
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    expect(activeOption(combobox)).toBe("Age");
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(activeOption(combobox)).toBe("Nationality");
    await user.keyboard("{Home}");
    expect(activeOption(combobox)).toBe("First name");
    await user.keyboard("{ArrowUp}");
    expect(activeOption(combobox)).toBe("First name"); 
  });

  it("Enter chooses the highlighted option and closes", async () => {
    const { user, onChange, combobox } = setup("last");
    combobox.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledExactlyOnceWith("age");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("Space chooses the highlighted option and closes", async () => {
    const { user, onChange, combobox } = setup("last");
    combobox.focus();
    await user.keyboard("{ArrowDown}{ArrowUp} "); 
    expect(onChange).toHaveBeenCalledExactlyOnceWith("first");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("Escape closes without choosing, and keeps focus on the button", async () => {
    const { user, onChange, combobox } = setup("last");
    combobox.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(combobox).toHaveFocus();
  });

  it("Tab closes it and moves on WITHOUT choosing (a stray Tab must not trigger a reload)", async () => {
    const { user, onChange, combobox } = setup("last");
    combobox.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Tab}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "elsewhere" })).toHaveFocus();
  });
});
