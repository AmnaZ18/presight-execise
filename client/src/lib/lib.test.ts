import { describe, expect, it } from "vitest";
import { AVATAR_KEYS, avatarColors, initials } from "./avatar";
import { chunk, columnsForWidth } from "./layout";
import { toggleValue, uniqueTrimmed } from "./values";

describe("avatar", () => {
  it("builds initials from the first and last name", () => {
    expect(initials("Kenta", "Ando")).toBe("KA");
    expect(initials("  ana ", "barbosa")).toBe("AB");
    expect(initials("Garnet", "Reynolds-Miller")).toBe("GR");
  });

  it("copes with an empty name instead of throwing", () => {
    expect(initials("", "")).toBe("");
    expect(initials("Mo", "")).toBe("M");
  });

  it("knows all 8 palette keys the API's seed data uses", () => {
    expect([...AVATAR_KEYS].sort()).toEqual(
      ["blue", "coral", "green", "lavender", "orange", "purple", "tan", "yellow"].sort()
    );
  });

  it("falls back to a neutral color for an unknown key", () => {
    expect(avatarColors("not-a-color")).toEqual({ bg: "#e7e5dc", fg: "#6b6656" });
    expect(avatarColors("purple").bg).toBe("#e3def6");
  });
});

describe("layout", () => {
  it("picks 1, 2 or 3 columns from the available width", () => {
    expect(columnsForWidth(390)).toBe(1);
    expect(columnsForWidth(519)).toBe(1);
    expect(columnsForWidth(520)).toBe(2);
    expect(columnsForWidth(859)).toBe(2);
    expect(columnsForWidth(860)).toBe(3);
    expect(columnsForWidth(1176)).toBe(3);
  });

  it("chunks a list into rows, with a shorter final row", () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    expect(chunk([], 3)).toEqual([]);
    expect(chunk([1, 2], 1)).toEqual([[1], [2]]);
  });
});

describe("values", () => {
  it("uniqueTrimmed trims, drops blanks, and removes case-insensitive duplicates", () => {
    expect(uniqueTrimmed([" Hiking", "hiking", "", "  ", "Yoga"])).toEqual(["Hiking", "Yoga"]);
  });

  it("toggleValue adds a missing value and removes a present one, ignoring case", () => {
    expect(toggleValue(["Hiking"], "Yoga")).toEqual(["Hiking", "Yoga"]);
    expect(toggleValue(["Hiking", "Yoga"], "hiking")).toEqual(["Yoga"]);
    expect(toggleValue([], "Hiking")).toEqual(["Hiking"]);
  });
});
