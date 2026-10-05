import { describe, expect, it } from "vitest";
import { db } from "../client.js";
import { getUsers } from "./users.js";
import type { UserQuery } from "../../schemas/query.js";

const baseQuery: UserQuery = {
  search: "",
  nationality: [],
  hobby: [],
  sort: "first_name",
  dir: "asc",
  page: 1,
  pageSize: 30,
};

function collectAllIds(overrides: Partial<UserQuery>, pageSize = 137) {
  const ids: number[] = [];
  let page = 1;
  let hasMore = true;
  let total = 0;

  while (hasMore) {
    const result = getUsers({ ...baseQuery, ...overrides, pageSize, page });
    total = result.total;
    ids.push(...result.users.map((u) => u.id));
    hasMore = result.hasMore;
    page++;
    expect(page).toBeLessThan(200);
  }
  return { ids, total };
}

describe("getUsers", () => {
  it("reports the correct total and page of results with no filters", () => {
    const result = getUsers(baseQuery);
    const actualTotal = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;

    expect(result.total).toBe(actualTotal);
    expect(result.users).toHaveLength(30);
    expect(result.hasMore).toBe(true); 
  });

  it("hasMore is false exactly on the final page, true on every page before it", () => {
    const pageSize = 30;
    const total = getUsers({ ...baseQuery, pageSize }).total;
    const lastPage = Math.ceil(total / pageSize);

    const secondToLast = getUsers({ ...baseQuery, pageSize, page: lastPage - 1 });
    expect(secondToLast.hasMore).toBe(true);

    const last = getUsers({ ...baseQuery, pageSize, page: lastPage });
    expect(last.hasMore).toBe(false);
  
    expect(last.users.length).toBe(total - (lastPage - 1) * pageSize);
  });

  it("pagination across every page is gapless and duplicate-free — no user missing, none repeated", () => {
    const { ids, total } = collectAllIds({ sort: "last_name", dir: "asc" });
    expect(ids).toHaveLength(total);
    expect(new Set(ids).size).toBe(total); 
  });

  it("stays gapless and duplicate-free when sorting descending on a heavily tied column", () => {
    const { ids, total } = collectAllIds({ sort: "age", dir: "desc" });
    expect(ids).toHaveLength(total);
    expect(new Set(ids).size).toBe(total);
  });

  it("sorting by age ascending is monotonic across a page, id ascending on equal ages", () => {
    const result = getUsers({ ...baseQuery, sort: "age", dir: "asc", pageSize: 100 });
    for (let i = 1; i < result.users.length; i++) {
      const prev = result.users[i - 1];
      const curr = result.users[i];
      const inOrder = prev.age < curr.age || (prev.age === curr.age && prev.id < curr.id);
      expect(inOrder).toBe(true);
    }
  });

  it("sorting by age descending still breaks ties by id ASCENDING", () => {
    const result = getUsers({ ...baseQuery, sort: "age", dir: "desc", pageSize: 100 });
    let ties = 0;
    for (let i = 1; i < result.users.length; i++) {
      const prev = result.users[i - 1];
      const curr = result.users[i];
      const inOrder = prev.age > curr.age || (prev.age === curr.age && prev.id < curr.id);
      expect(inOrder).toBe(true);
      if (prev.age === curr.age) ties++;
    }
  
    expect(ties).toBeGreaterThan(0);
  });

  it("attaches each returned user's correct hobbies, matching a direct lookup", () => {
    const result = getUsers({ ...baseQuery, pageSize: 5 });
    for (const user of result.users) {
      const directHobbies = (
        db
          .prepare(
            `SELECT hobbies.name as name FROM user_hobbies
             JOIN hobbies ON hobbies.id = user_hobbies.hobby_id
             WHERE user_hobbies.user_id = ? ORDER BY hobbies.name ASC`
          )
          .all(user.id) as { name: string }[]
      ).map((r) => r.name);

      expect(user.hobbies).toEqual(directHobbies);
    }
  });

  it("applies the nationality filter — every returned user matches", () => {
    const result = getUsers({ ...baseQuery, nationality: ["Brazil"], pageSize: 50 });
    expect(result.users.length).toBeGreaterThan(0);
    for (const user of result.users) {
      expect(user.nationality).toBe("Brazil");
    }
  });
});
