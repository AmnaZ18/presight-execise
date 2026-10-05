import { describe, expect, it } from "vitest";
import { userQuerySchema } from "./query.js";

describe("userQuerySchema", () => {
  it("applies defaults when nothing is provided", () => {
    const result = userQuerySchema.parse({});
    expect(result).toEqual({
      search: "",
      nationality: [],
      hobby: [],
      sort: "first_name",
      dir: "asc",
      page: 1,
      pageSize: 60,
    });
  });

  it("normalizes a single repeated-param value into a one-element array", () => {
    const result = userQuerySchema.parse({ hobby: "Hiking" });
    expect(result.hobby).toEqual(["Hiking"]);
  });

  it("keeps a multi-value param as an array", () => {
    const result = userQuerySchema.parse({ nationality: ["Brazil", "Japan"] });
    expect(result.nationality).toEqual(["Brazil", "Japan"]);
  });

  it("coerces page/pageSize strings into numbers", () => {
    const result = userQuerySchema.parse({ page: "3", pageSize: "50" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
  });

  it("rejects a sort field that isn't one of the 4 allowed columns", () => {
    expect(() => userQuerySchema.parse({ sort: "middle_name" })).toThrow();
  });

  it("rejects a pageSize above the 100 cap", () => {
    expect(() => userQuerySchema.parse({ pageSize: "5000" })).toThrow();
  });

  it("removes duplicate values, case-insensitively, keeping the first spelling", () => {
    const result = userQuerySchema.parse({ hobby: ["Hiking", "hiking", "Hiking", "Yoga"] });
    expect(result.hobby).toEqual(["Hiking", "Yoga"]);
  });

  it("trims values and drops blanks — ?hobby= means no filter, not 'match nobody'", () => {
    expect(userQuerySchema.parse({ hobby: "" }).hobby).toEqual([]);
    expect(userQuerySchema.parse({ nationality: ["  Brazil ", "", "   "] }).nationality).toEqual(["Brazil"]);
  });

  it("rejects a non-numeric page value instead of silently becoming NaN", () => {
    expect(() => userQuerySchema.parse({ page: "abc" })).toThrow();
  });
});
