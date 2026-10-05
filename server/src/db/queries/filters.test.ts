import { describe, expect, it } from "vitest";
import { db } from "../client.js";
import { buildUserFilterClause } from "./filters.js";

function countUsers(filters: Parameters<typeof buildUserFilterClause>[0]): number {
  const { sql, params } = buildUserFilterClause(filters);
  const row = db.prepare(`SELECT COUNT(*) as count FROM users ${sql}`).get(...params) as { count: number };
  return row.count;
}

describe("buildUserFilterClause", () => {
  it("returns every user when no filters are set", () => {
    const total = countUsers({ search: "", nationality: [], hobby: [] });
    const actualTotal = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
    expect(total).toBe(actualTotal);
    expect(total).toBeGreaterThan(0);
  });

  it("search matches are case-insensitive and every result actually contains the term", () => {
    const { sql, params } = buildUserFilterClause({ search: "an", nationality: [], hobby: [] });
    const rows = db
      .prepare(`SELECT first_name, last_name FROM users ${sql}`)
      .all(...params) as { first_name: string; last_name: string }[];

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const matches =
        row.first_name.toLowerCase().includes("an") || row.last_name.toLowerCase().includes("an");
      expect(matches).toBe(true);
    }
  });

  it("multiple nationalities use OR — result equals the union", () => {
    const brazil = countUsers({ search: "", nationality: ["Brazil"], hobby: [] });
    const japan = countUsers({ search: "", nationality: ["Japan"], hobby: [] });
    const both = countUsers({ search: "", nationality: ["Brazil", "Japan"], hobby: [] });

    expect(both).toBe(brazil + japan);
  });

  it("multiple hobbies use AND — result equals the intersection, verified via an independently-written query", () => {
    const { sql, params } = buildUserFilterClause({ search: "", nationality: [], hobby: ["Hiking", "Yoga"] });
    const viaBuilder = (db.prepare(`SELECT COUNT(*) as count FROM users ${sql}`).get(...params) as {
      count: number;
    }).count;

    const viaIntersect = (
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

    expect(viaBuilder).toBe(viaIntersect);
    expect(viaBuilder).toBeGreaterThan(0);
  });

  it("a user with only SOME of the selected hobbies is correctly excluded (AND, not OR)", () => {
    const onlyHiking = db
      .prepare(
        `SELECT u.id FROM users u
         WHERE u.id IN (SELECT user_id FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id WHERE h.name = 'Hiking')
         AND u.id NOT IN (SELECT user_id FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id WHERE h.name = 'Chess')
         LIMIT 1`
      )
      .get() as { id: number } | undefined;

    expect(onlyHiking).toBeDefined();

    const { sql, params } = buildUserFilterClause({ search: "", nationality: [], hobby: ["Hiking", "Chess"] });
    const matchedIds = db.prepare(`SELECT id FROM users ${sql}`).all(...params) as { id: number }[];
    expect(matchedIds.map((r) => r.id)).not.toContain(onlyHiking!.id);
  });

  it("search, nationality, and hobby filters combine with AND — combined count never exceeds any single filter's count", () => {
    const searchOnly = countUsers({ search: "an", nationality: [], hobby: [] });
    const combined = countUsers({ search: "an", nationality: ["Brazil"], hobby: ["Hiking"] });
    expect(combined).toBeLessThanOrEqual(searchOnly);
  });

  it("duplicate or differently-cased hobby values give the same users as the value once, not zero", () => {
    const once = countUsers({ search: "", nationality: [], hobby: ["Hiking"] });
    expect(once).toBeGreaterThan(0);
    expect(countUsers({ search: "", nationality: [], hobby: ["Hiking", "Hiking"] })).toBe(once);
    expect(countUsers({ search: "", nationality: [], hobby: ["hiking", "Hiking"] })).toBe(once);
  });

  it("a person's full name finds them, and never finds more people than their first name alone", () => {
    const person = db.prepare("SELECT id, first_name, last_name FROM users WHERE id = 1").get() as {
      id: number;
      first_name: string;
      last_name: string;
    };

    const { sql, params } = buildUserFilterClause({
      search: `${person.first_name} ${person.last_name}`,
      nationality: [],
      hobby: [],
    });
    const ids = (db.prepare(`SELECT id FROM users ${sql}`).all(...params) as { id: number }[]).map((r) => r.id);

    expect(ids).toContain(person.id);
    expect(ids.length).toBeLessThanOrEqual(countUsers({ search: person.first_name, nationality: [], hobby: [] }));
  });

  it("blank filter values are ignored rather than matching nothing", () => {
    const total = countUsers({ search: "", nationality: [], hobby: [] });
    expect(countUsers({ search: "", nationality: [""], hobby: [""] })).toBe(total);
  });

  it("produces no WHERE clause and no params when every filter is empty", () => {
    const { sql, params } = buildUserFilterClause({ search: "", nationality: [], hobby: [] });
    expect(sql).toBe("");
    expect(params).toEqual([]);
  });
});
