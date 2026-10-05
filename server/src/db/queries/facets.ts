import { db } from "../client.js";
import { uniqueTrimmed } from "../../lib/values.js";
import { buildUserFilterClause, type UserFilters } from "./filters.js";

export interface FacetCount {
  value: string;
  count: number;
}

const FACET_LIMIT = 20;

function byCountThenName(a: FacetCount, b: FacetCount): number {
  if (b.count !== a.count) return b.count - a.count;
  const aName = a.value.toLowerCase();
  const bName = b.value.toLowerCase();
  return aName < bName ? -1 : aName > bName ? 1 : 0;
}

export function pickTopFacetValues(rows: FacetCount[], selected: string[]): FacetCount[] {
  const selectedValues = uniqueTrimmed(selected);
  const selectedKeys = new Set(selectedValues.map((value) => value.toLowerCase()));
  const rowsByKey = new Map(rows.map((row) => [row.value.toLowerCase(), row]));

  const pinned = selectedValues.map((value) => rowsByKey.get(value.toLowerCase()) ?? { value, count: 0 });
  const others = rows.filter((row) => !selectedKeys.has(row.value.toLowerCase()));

  return [...pinned, ...others].slice(0, FACET_LIMIT).sort(byCountThenName);
}

export function getTopHobbies(filters: UserFilters): FacetCount[] {
  const { sql: whereSql, params } = buildUserFilterClause(filters);
  const rows = db
    .prepare(
      `SELECT hobbies.name as value, COUNT(DISTINCT users.id) as count
       FROM users
       JOIN user_hobbies ON user_hobbies.user_id = users.id
       JOIN hobbies ON hobbies.id = user_hobbies.hobby_id
       ${whereSql}
       GROUP BY hobbies.name
       ORDER BY count DESC, hobbies.name ASC`
    )
    .all(...params) as FacetCount[];
  return pickTopFacetValues(rows, filters.hobby);
}

export function getTopNationalities(filters: UserFilters): FacetCount[] {
  const { sql: whereSql, params } = buildUserFilterClause({ ...filters, nationality: [] });
  const rows = db
    .prepare(
      `SELECT users.nationality as value, COUNT(*) as count
       FROM users
       ${whereSql}
       GROUP BY users.nationality
       ORDER BY count DESC, users.nationality ASC`
    )
    .all(...params) as FacetCount[];
  return pickTopFacetValues(rows, filters.nationality);
}
