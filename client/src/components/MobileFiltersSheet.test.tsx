import { describe, expect, it } from "vitest";
import { applyLabel } from "./MobileFiltersSheet";

describe("applyLabel", () => {
  it("says 'Show all users' when nothing narrows the list down, whatever the number is", () => {
    expect(applyLabel(5000, false)).toBe("Show all users");
    expect(applyLabel(1, false)).toBe("Show all users");
  });

  it("shows 'Show all users' right away, without waiting for the count to load", () => {
    expect(applyLabel(undefined, false)).toBe("Show all users");
  });

  it("shows the count once a search or a filter narrows the list", () => {
    expect(applyLabel(500, true)).toBe("Show 500 users");
    expect(applyLabel(1234, true)).toBe("Show 1,234 users");
  });

  it("says '1 user' in the singular", () => {
    expect(applyLabel(1, true)).toBe("Show 1 user");
  });

  it("says 'No users match' when the filters match nobody", () => {
    expect(applyLabel(0, true)).toBe("No users match");
  });

  it("says 'Show results' while a filtered count is still loading", () => {
    expect(applyLabel(undefined, true)).toBe("Show results");
  });

  it("keeps saying 'No users match' for an empty directory rather than 'Show all users'", () => {
    expect(applyLabel(0, false)).toBe("No users match");
  });
});
