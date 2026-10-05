
# On the very first start there is no data yet, so the database is seeded before the server 
# On every later start the data is already in the volume and is left untouched
set -e

needs_seed=$(node --input-type=module -e "
  import Database from 'better-sqlite3';
  import { existsSync } from 'node:fs';

  let empty = true;
  if (existsSync(process.env.DB_PATH)) {
    const db = new Database(process.env.DB_PATH);
    try {
      empty = db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0;
    } catch {
      empty = true; // file exists but the tables don't
    }
    db.close();
  }
  process.stdout.write(empty ? 'yes' : 'no');
")

if [ "$needs_seed" = "yes" ]; then
  echo "[entrypoint] No data in $DB_PATH - seeding it (one-off, takes a couple of seconds)..."
  node dist/db/seed.js
else
  echo "[entrypoint] Found existing data in $DB_PATH - leaving it untouched."
fi

exec node dist/index.js
