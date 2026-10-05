import { describe, expect, it } from "vitest";
import {
  directionLabel,
  facetSelectionCount,
  hasActiveFilters,
  parseViewState,
  sortSummary,
  toFilters,
  toSearchParams,
  type ViewState,
} from "./viewState";

const parse = (query: string) => parseViewState(new URLSearchParams(query));

describe("parseViewState", () => {
  it("returns the defaults for an empty URL", () => {
    expect(parse("")).toEqual({
      search: "",
      nationalities: [],
      hobbies: [],
      sort: "first_name",
      dir: "asc",
    });
  });

  it("restores a full view from a shared URL", () => {
    expect(
      parse("search=an&nationality=Brazil&nationality=Japan&hobby=Hiking&hobby=Yoga&sort=age&dir=desc")
    ).toEqual({
      search: "an",
      nationalities: ["Brazil", "Japan"],
      hobbies: ["Hiking", "Yoga"],
      sort: "age",
      dir: "desc",
    });
  });

  it("falls back to defaults for a hand-edited, invalid sort or dir instead of breaking", () => {
    const state = parse("sort=middle_name&dir=sideways");
    expect(state.sort).toBe("first_name");
    expect(state.dir).toBe("asc");
  });

  it("removes duplicate and blank filter values", () => {
    const state = parse("hobby=Hiking&hobby=hiking&hobby=&nationality=%20Brazil%20&nationality=");
    expect(state.hobbies).toEqual(["Hiking"]);
    expect(state.nationalities).toEqual(["Brazil"]);
  });

  it("keeps the search text exactly as typed, including a trailing space", () => {
    // Trimming here would delete the space someone just typed while writing "mohd rashid".
    expect(parse("search=mohd+").search).toBe("mohd ");
  });
});

describe("toSearchParams", () => {
  const base: ViewState = { search: "", nationalities: [], hobbies: [], sort: "first_name", dir: "asc" };

  it("produces an empty query string for the default view", () => {
    expect(toSearchParams(base).toString()).toBe("");
  });

  it("only writes what differs from the defaults", () => {
    expect(toSearchParams({ ...base, sort: "age" }).toString()).toBe("sort=age");
    expect(toSearchParams({ ...base, dir: "desc" }).toString()).toBe("dir=desc");
  });

  it("writes repeated params for multi-select filters, in a stable order", () => {
    const params = toSearchParams({
      search: "an",
      nationalities: ["Brazil", "Japan"],
      hobbies: ["Hiking"],
      sort: "last_name",
      dir: "desc",
    });
    expect(params.toString()).toBe(
      "search=an&nationality=Brazil&nationality=Japan&hobby=Hiking&sort=last_name&dir=desc"
    );
  });

  it("omits a whitespace-only search", () => {
    expect(toSearchParams({ ...base, search: "   " }).toString()).toBe("");
  });

  it("round-trips: parse(serialize(state)) gives the state back", () => {
    const state: ViewState = {
      search: "mohd rashid",
      nationalities: ["United States", "Brazil"],
      hobbies: ["Hiking", "Yoga"],
      sort: "nationality",
      dir: "desc",
    };
    expect(parseViewState(toSearchParams(state))).toEqual(state);
  });
});

describe("helpers", () => {
  it("toFilters trims the search so a trailing space isn't a different query", () => {
    expect(toFilters({ search: " mohd ", nationalities: ["Brazil"], hobbies: [] })).toEqual({
      search: "mohd",
      nationalities: ["Brazil"],
      hobbies: [],
    });
  });

  it("counts only the facet selections for the Filters badge, not the search text", () => {
    expect(facetSelectionCount({ search: "an", nationalities: ["Brazil"], hobbies: ["Hiking", "Yoga"] })).toBe(3);
  });

  it("hasActiveFilters is true for search text OR any selection", () => {
    expect(hasActiveFilters({ search: "", nationalities: [], hobbies: [] })).toBe(false);
    expect(hasActiveFilters({ search: "  ", nationalities: [], hobbies: [] })).toBe(false);
    expect(hasActiveFilters({ search: "an", nationalities: [], hobbies: [] })).toBe(true);
    expect(hasActiveFilters({ search: "", nationalities: [], hobbies: ["Hiking"] })).toBe(true);
  });

  it("labels sort direction sensibly per field type", () => {
    expect(directionLabel("last_name", "asc")).toBe("A–Z");
    expect(directionLabel("last_name", "desc")).toBe("Z–A");
    expect(directionLabel("age", "asc")).toBe("Low–High");
    expect(directionLabel("age", "desc")).toBe("High–Low");
    expect(sortSummary("last_name", "asc")).toBe("last name, A–Z");
  });
});
