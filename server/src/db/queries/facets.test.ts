import { describe, expect, it } from "vitest";
import { db } from "../client.js";
import { getTopHobbies, getTopNationalities, pickTopFacetValues, type FacetCount } from "./facets.js";

const noFilters = { search: "", nationality: [], hobby: [] };
// Matches nobody in the seed data
const NO_MATCH_SEARCH = "zzzzqq";

function rankedNationalities(): FacetCount[] {
  return db
    .prepare("SELECT nationality as value, COUNT(*) as count FROM users GROUP BY nationality ORDER BY count DESC, nationality ASC")
    .all() as FacetCount[];
}

describe("pickTopFacetValues", () => {
  const rows: FacetCount[] = Array.from({ length: 25 }, (_, i) => ({
    value: `Item${String(i).padStart(2, "0")}`,
    count: 100 - i,
  }));

  it("returns the first 20 rows when nothing is selected", () => {
    expect(pickTopFacetValues(rows, [])).toEqual(rows.slice(0, 20));
  });

  it("keeps a selected value that ranks outside the top 20 and still returns exactly 20", () => {
    const result = pickTopFacetValues(rows, ["Item24"]);
    const values = result.map((r) => r.value);
    expect(result).toHaveLength(20);
    expect(values).toContain("Item24");
  
    expect(values).not.toContain("Item19");
    
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count);
    }
  });

  it("adds a selected value with count 0 when it isn't among the rows at all", () => {
    const result = pickTopFacetValues(rows.slice(0, 3), ["Ghost"]);
    expect(result).toHaveLength(4);
    expect(result[result.length - 1]).toEqual({ value: "Ghost", count: 0 });
  });

  it("matches selected values case-insensitively, keeping the row's own spelling and count", () => {
    const result = pickTopFacetValues(rows, ["item03"]);
    const matches = result.filter((r) => r.value.toLowerCase() === "item03");
    expect(matches).toEqual([{ value: "Item03", count: 97 }]);
  });

  it("breaks count ties by name", () => {
    const tied: FacetCount[] = [
      { value: "Banana", count: 5 },
      { value: "apple", count: 5 },
      { value: "Cherry", count: 9 },
    ];
    expect(pickTopFacetValues(tied, []).map((r) => r.value)).toEqual(["Cherry", "apple", "Banana"]);
  });
});

describe("getTopNationalities", () => {
  it("returns at most 20 entries, sorted by count descending", () => {
    const result = getTopNationalities(noFilters);
    expect(result.length).toBeLessThanOrEqual(20);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count);
    }
  });

  it("matches an independently-written full GROUP BY over every nationality, not just the top 20", () => {
    expect(getTopNationalities(noFilters)).toEqual(rankedNationalities().slice(0, 20));
  });

  it("selecting a nationality does not hide the others — multi-select must stay possible", () => {
    const result = getTopNationalities({ search: "", nationality: ["Brazil"], hobby: [] });
    expect(result.length).toBeGreaterThan(1);
    expect(result.map((r) => r.value)).toContain("Brazil");
  });

  it("counts ignore the nationality selection itself but still respect the other filters", () => {
    const withSelection = getTopNationalities({ search: "", nationality: ["Brazil"], hobby: ["Hiking"] });
    const withoutSelection = getTopNationalities({ search: "", nationality: [], hobby: ["Hiking"] });

    const other = withSelection.find((entry) => entry.value !== "Brazil")!;
    const expected = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM users
           WHERE nationality = ? AND id IN (
             SELECT user_id FROM user_hobbies
             JOIN hobbies ON hobbies.id = user_hobbies.hobby_id
             WHERE hobbies.name = 'Hiking')`
        )
        .get(other.value) as { count: number }
    ).count;
    expect(other.count).toBe(expected);

    for (const entry of withSelection) {
      const twin = withoutSelection.find((e) => e.value === entry.value);
      if (twin) expect(entry.count).toBe(twin.count);
    }
  });

  it("with several nationalities selected, all of them stay listed with their real counts", () => {
    const ranked = rankedNationalities();
    const brazil = ranked.find((r) => r.value === "Brazil")!;
    const japan = ranked.find((r) => r.value === "Japan")!;

    const result = getTopNationalities({ search: "", nationality: ["Brazil", "Japan"], hobby: [] });
    expect(result).toContainEqual(brazil);
    expect(result).toContainEqual(japan);
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("keeps a selected nationality that ranks outside the top 20, still capped at 20", () => {
    const ranked = rankedNationalities();
    const lowest = ranked[ranked.length - 1];
    expect(ranked.length).toBeGreaterThan(20); 

    const result = getTopNationalities({ search: "", nationality: [lowest.value], hobby: [] });
    expect(result).toHaveLength(20);
    expect(result).toContainEqual(lowest);
  });

  it("keeps a selected nationality visible with count 0 when the other filters match nobody", () => {
    const result = getTopNationalities({ search: NO_MATCH_SEARCH, nationality: ["Brazil"], hobby: [] });
    expect(result).toEqual([{ value: "Brazil", count: 0 }]);
  });
});

describe("getTopHobbies", () => {
  it("returns at most 20 entries, sorted by count descending", () => {
    const result = getTopHobbies(noFilters);
    expect(result.length).toBeLessThanOrEqual(20);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count);
    }
  });

  it("matches an independently-written full GROUP BY over every hobby, not just the top 20", () => {
    const groundTruth = db
      .prepare(
        `SELECT hobbies.name as value, COUNT(*) as count
         FROM user_hobbies JOIN hobbies ON hobbies.id = user_hobbies.hobby_id
         GROUP BY hobbies.name ORDER BY count DESC, hobbies.name ASC`
      )
      .all() as FacetCount[];

    expect(getTopHobbies(noFilters)).toEqual(groundTruth.slice(0, 20));
  });

  it("selecting a hobby makes its own count equal the filtered total — mirrors the mockup's Hiking=total behavior", () => {
    const filters = { search: "", nationality: [], hobby: ["Hiking"] };
    const total = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM users
           WHERE id IN (SELECT user_id FROM user_hobbies JOIN hobbies ON hobbies.id = user_hobbies.hobby_id WHERE hobbies.name = 'Hiking')`
        )
        .get() as { count: number }
    ).count;

    const hikingEntry = getTopHobbies(filters).find((r) => r.value === "Hiking");
    expect(hikingEntry?.count).toBe(total);
  });

  it("with two hobbies selected (AND), both show the intersection size and nothing exceeds it", () => {
    const filters = { search: "", nationality: [], hobby: ["Hiking", "Yoga"] };
    const intersectionTotal = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM (
            SELECT uh.user_id FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id WHERE h.name = 'Hiking'
            INTERSECT
            SELECT uh.user_id FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id WHERE h.name = 'Yoga'
          )`
        )
        .get() as { count: number }
    ).count;

    const result = getTopHobbies(filters);
    expect(result.find((r) => r.value === "Hiking")?.count).toBe(intersectionTotal);
    expect(result.find((r) => r.value === "Yoga")?.count).toBe(intersectionTotal);
    for (const entry of result) {
      expect(entry.count).toBeLessThanOrEqual(intersectionTotal);
    }
  });

  it("other hobbies stay listed after one is selected, so a second can be added", () => {
    const result = getTopHobbies({ search: "", nationality: [], hobby: ["Hiking"] });
    expect(result.length).toBeGreaterThan(1);
  });

  it("keeps a selected hobby visible with count 0 when the other filters match nobody", () => {
    const result = getTopHobbies({ search: NO_MATCH_SEARCH, nationality: [], hobby: ["Hiking"] });
    expect(result).toEqual([{ value: "Hiking", count: 0 }]);
  });
});
