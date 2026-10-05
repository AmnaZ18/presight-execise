import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { buildUserFilterClause } from "./filters.js";

const schemaSql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "schema.sql"), "utf-8");

let memoryDb: Database.Database;

beforeAll(() => {
  memoryDb = new Database(":memory:");
  memoryDb.exec(schemaSql);
  const insert = memoryDb.prepare(
    "INSERT INTO users (avatar, first_name, last_name, age, nationality) VALUES ('blue', ?, ?, 30, 'Brazil')"
  );
  insert.run("mohd", "ahmed");
  insert.run("sara", "khan");
  insert.run("mohd", "rashid");
});

function search(term: string): string[] {
  const { sql, params } = buildUserFilterClause({ search: term, nationality: [], hobby: [] });
  const rows = memoryDb
    .prepare(`SELECT first_name, last_name FROM users ${sql} ORDER BY id`)
    .all(...params) as { first_name: string; last_name: string }[];
  return rows.map((row) => `${row.first_name} ${row.last_name}`);
}

describe("multi-word search over ['mohd ahmed', 'sara khan', 'mohd rashid']", () => {
  it("one word matches every user with that word in either name", () => {
    expect(search("mohd")).toEqual(["mohd ahmed", "mohd rashid"]);
    expect(search("sara")).toEqual(["sara khan"]);
    expect(search("rashid")).toEqual(["mohd rashid"]);
  });

  it("a full name narrows to just that user — not zero", () => {
    expect(search("mohd rashid")).toEqual(["mohd rashid"]);
    expect(search("mohd ahmed")).toEqual(["mohd ahmed"]);
  });

  it("word order doesn't matter", () => {
    expect(search("rashid mohd")).toEqual(["mohd rashid"]);
  });

  it("ignores case and extra whitespace", () => {
    expect(search("  MOHD    Rashid ")).toEqual(["mohd rashid"]);
  });

  it("partial words work, each one independently", () => {
    expect(search("moh ras")).toEqual(["mohd rashid"]);
  });

  it("returns nobody when the words don't all belong to one person", () => {
    expect(search("mohd sara")).toEqual([]);
  });

  it("wildcard characters typed in a word are matched literally", () => {
    expect(search("mo_d")).toEqual([]);
    expect(search("%")).toEqual([]);
  });

  it("a blank or whitespace-only search means no filter", () => {
    expect(search("   ")).toEqual(["mohd ahmed", "sara khan", "mohd rashid"]);
  });
});
