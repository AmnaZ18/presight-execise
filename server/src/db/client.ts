import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH ?? join(currentDir, "..", "..", "data", "directory.db");

const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.pragma("foreign_keys = ON");

const schemaSql = readFileSync(join(currentDir, "schema.sql"), "utf-8");
db.exec(schemaSql);
