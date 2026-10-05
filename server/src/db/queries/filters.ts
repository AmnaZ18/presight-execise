import { uniqueTrimmed } from "../../lib/values.js";

export interface UserFilters {
  search: string;
  nationality: string[];
  hobby: string[];
}

export interface WhereClause {
  sql: string;
  params: (string | number)[];
}

function escapeLikeValue(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function buildUserFilterClause(filters: UserFilters): WhereClause {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  const nationalities = uniqueTrimmed(filters.nationality);
  const hobbies = uniqueTrimmed(filters.hobby);

  const searchWords = filters.search.split(/\s+/).filter((word) => word !== "");
  for (const word of searchWords) {
    conditions.push("(users.first_name LIKE ? ESCAPE '\\' OR users.last_name LIKE ? ESCAPE '\\')");
    const pattern = `%${escapeLikeValue(word)}%`;
    params.push(pattern, pattern);
  }

  if (nationalities.length > 0) {
    const placeholders = nationalities.map(() => "?").join(", ");
    conditions.push(`users.nationality IN (${placeholders})`);
    params.push(...nationalities);
  }

  if (hobbies.length > 0) {
    const placeholders = hobbies.map(() => "?").join(", ");
    conditions.push(
      `users.id IN (
        SELECT user_hobbies.user_id
        FROM user_hobbies
        JOIN hobbies ON hobbies.id = user_hobbies.hobby_id
        WHERE hobbies.name IN (${placeholders})
        GROUP BY user_hobbies.user_id
        HAVING COUNT(DISTINCT hobbies.name) = ?
      )`
    );
    params.push(...hobbies, hobbies.length);
  }

  const sql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { sql, params };
}
