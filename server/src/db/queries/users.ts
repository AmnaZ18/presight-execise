import { db } from "../client.js";
import type { UserQuery } from "../../schemas/query.js";
import { buildUserFilterClause } from "./filters.js";

export interface UserRecord {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

export interface PaginatedUsers {
  users: UserRecord[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

const SORT_COLUMNS: Record<UserQuery["sort"], string> = {
  first_name: "users.first_name",
  last_name: "users.last_name",
  age: "users.age",
  nationality: "users.nationality",
};

function getHobbiesForUsers(userIds: number[]): Map<number, string[]> {
  const hobbiesByUser = new Map<number, string[]>();
  if (userIds.length === 0) return hobbiesByUser;

  const placeholders = userIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT user_hobbies.user_id as userId, hobbies.name as name
       FROM user_hobbies
       JOIN hobbies ON hobbies.id = user_hobbies.hobby_id
       WHERE user_hobbies.user_id IN (${placeholders})
       ORDER BY hobbies.name ASC`
    )
    .all(...userIds) as { userId: number; name: string }[];

  for (const row of rows) {
    const list = hobbiesByUser.get(row.userId) ?? [];
    list.push(row.name);
    hobbiesByUser.set(row.userId, list);
  }
  return hobbiesByUser;
}

export function getUsers(query: UserQuery): PaginatedUsers {
  const { sql: whereSql, params: whereParams } = buildUserFilterClause(query);

  const { count: total } = db
    .prepare(`SELECT COUNT(*) as count FROM users ${whereSql}`)
    .get(...whereParams) as { count: number };

  const sortColumn = SORT_COLUMNS[query.sort];
  const direction = query.dir === "desc" ? "DESC" : "ASC";
  const offset = (query.page - 1) * query.pageSize;

  const rows = db
    .prepare(
      `SELECT users.id, users.avatar, users.first_name, users.last_name, users.age, users.nationality
       FROM users
       ${whereSql}
       ORDER BY ${sortColumn} ${direction}, users.id ASC
       LIMIT ? OFFSET ?`
    )
    .all(...whereParams, query.pageSize, offset) as Omit<UserRecord, "hobbies">[];

  const hobbiesByUser = getHobbiesForUsers(rows.map((row) => row.id));
  const users: UserRecord[] = rows.map((row) => ({
    ...row,
    hobbies: hobbiesByUser.get(row.id) ?? [],
  }));

  return {
    users,
    page: query.page,
    pageSize: query.pageSize,
    total,
    hasMore: offset + rows.length < total,
  };
}
