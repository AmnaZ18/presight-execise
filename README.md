# User Directory

A searchable, filterable directory of 5,000 users: a React client, a Node.js API, and a SQLite database.
Search by name, narrow by nationality and hobbies, sort, and scroll through the results with a
virtualized infinite list. Every part of the view is kept in the URL, so a link restores exactly what you were looking at.

| Part | Stack |
| --- | --- |
| `client/` | React 19, Vite, TypeScript, Tailwind CSS 4, TanStack Query (data fetching), TanStack Virtual (virtual list), React Router (URL state) |
| `server/` | Node.js 22, Express 5, TypeScript, better-sqlite3 (raw SQL), zod (request validation) |
| Database | SQLite file, seeded with 5,000 generated users |

> The original assignment brief is kept, unchanged, [at the bottom of this file](#original-brief).

---

## Quick start

### Option A: Docker Compose (nothing else to install)

```bash
docker compose up --build
```

Then open **http://localhost:8080**.

- The first start seeds the database automatically (a couple of seconds). Later starts reuse the data.
- The database lives in a Docker volume (`db-data`), so it survives `docker compose down` and restarts.
- Stop with `Ctrl+C`, or `docker compose down` from another terminal.
- Start from scratch (delete the data too): `docker compose down -v`
- Re-seed a running stack: `docker compose exec server node dist/db/seed.js`
- Port 8080 taken? `CLIENT_PORT=9000 docker compose up --build`
- The API is reachable through the same port, e.g. http://localhost:8080/api/health

Two containers run: `client` (nginx serving the React build and forwarding `/api`) and `server` (the Node API).
Because the browser only talks to nginx, no CORS setup is needed.

### Option B: Run it locally

You need **Node.js 22** and **Yarn 1.x** (classic).

```bash
yarn install     # install both packages
yarn seed        # create and fill the SQLite database
yarn dev         # start the API and the client together
```

Then open **http://localhost:5173**. The API listens on port 4000, and the Vite dev server forwards `/api` to it.
The first `yarn dev` takes several seconds to start.

Each package (`client/`, `server/`) installs its own complete set of dependencies rather than sharing hoisted ones
(`nohoist` in the root `package.json`). That keeps a local install identical to what the Docker images build, and
avoids duplicate copies of tools like Vite and Vitest confusing TypeScript.

## Seeding the database

`yarn seed` creates (or refreshes) the SQLite file at `server/data/directory.db`:

- **5,000 users**, each with an avatar colour, first name, last name, age (18-75) and nationality
- **40 hobbies** and **40 nationalities**, chosen from fixed lists so that counts repeat and "top 20" means something
- **0 to 10 hobbies per user** (about 25,000 user-hobby links)
- **Deterministic**: the generator is seeded, so everyone gets exactly the same data

It is destructive: it deletes all existing rows first. The schema ([`server/src/db/schema.sql`](server/src/db/schema.sql))
is applied automatically whenever the server starts, so there is no separate migration step.
Set `DB_PATH` to use a different file.

## Commands

Run from the repository root.

| Command | What it does |
| --- | --- |
| `yarn dev` | API (port 4000) and client (port 5173) with live reload |
| `yarn seed` | Create and fill the database (wipes existing data) |
| `yarn test` | Server tests (re-seeds the database first), then client tests |
| `yarn build` | Production build of both packages |
| `yarn start` | Run the production builds (after `yarn build`) |
| `docker compose up --build` | Everything in containers, on port 8080 |

## API

All endpoints are `GET` and return JSON. A bad query parameter returns `400` with the validation issues.

### `GET /api/users`

| Parameter | Meaning |
| --- | --- |
| `search` | Text filter. Every word must appear in the first **or** last name, case-insensitive, in any order: `mohd` finds both "Mohd Ahmed" and "Mohd Rashid"; `mohd rashid` finds only the second. |
| `nationality` | Repeat for several (`nationality=Brazil&nationality=Japan`). A user matches **any** of them. |
| `hobby` | Repeat for several. A user must have **all** of them. |
| `sort` | `first_name` (default), `last_name`, `age` or `nationality` |
| `dir` | `asc` (default) or `desc` |
| `page` | Page number, from 1 (default 1) |
| `pageSize` | Users per page (default 60, maximum 100) |

All filters combine with AND. Sorting is deterministic: users with equal values are ordered by `id` ascending,
so paging never repeats or skips anyone.

```json
{
  "users": [
    { "id": 2649, "avatar": "purple", "first_name": "Aaron", "last_name": "Gutkowski",
      "age": 19, "nationality": "Switzerland", "hobbies": ["Boxing", "Cooking", "Fishing"] }
  ],
  "page": 1, "pageSize": 60, "total": 5000, "hasMore": true
}
```

`total` is the number of users matching the filters (not just this page); `hasMore` says whether another page exists.

### `GET /api/hobbies/top` and `GET /api/nationalities/top`

Take the same `search`, `nationality` and `hobby` parameters (no sorting or paging) and return up to 20
`{ value, count }` entries, most common first:

```json
{ "hobbies": [ { "value": "Hiking", "count": 632 }, { "value": "Yoga", "count": 41 } ] }
```

The counts cover **every user matching the current filters**, not just the page being shown, and they
refresh together with the list. Two details:

- **Hobbies** are counted with your selected hobbies applied, so each count means "how many of these results also have this hobby".
- **Nationalities** are counted *without* your selected nationalities, so choosing one doesn't hide the others
  and you can add a second.

### `GET /api/health`

Returns `{ "status": "ok" }`. Used by the Docker healthcheck.

## How the client works

- **The URL is the state.** `?search=an&nationality=Brazil&hobby=Hiking&sort=age&dir=desc` holds the search text,
  selected filters and sort. Reloading or sharing the link restores the view, and the back button steps through filter changes.
  Anything left out of the URL is the default.
- **Virtualized infinite scroll.** Only the rows near the viewport exist in the DOM, however many users are loaded.
  The next page is requested as you approach the end, and "Showing 60 of 214" counts up as pages arrive.
- **One responsive layout.** On wide screens the filters are a sidebar that applies on every click. Below 1024px
  they open in a bottom sheet that drafts your choices and applies them with "Show N users".
- **Loading, empty and error states** are all handled, with retry on errors.

## Project layout

```
client/            React app (Vite)
  src/api/           fetch functions and response types
  src/state/         URL <-> view-state parsing
  src/hooks/         data hooks (TanStack Query) and URL state
  src/components/    UI: cards, filters, virtual list, mobile sheet
server/            Node API
  src/schemas/       request validation (zod)
  src/db/            schema.sql, connection, seed script
  src/db/queries/    filter builder, user list, top-20 counts
  src/routes/        the four endpoints
docker/            nginx config and the server's start-up script
Dockerfile         builds the server and client images
docker-compose.yml runs both
```

## Tests

`yarn test` runs both suites against real code paths: the server tests use the seeded SQLite database
(and cross-check the SQL with independently written queries), and the client tests run the whole page
against a fake API.

Note that the server's `pretest` step re-seeds `server/data/directory.db`, so running the tests resets your local data
(it is regenerated identically).

## Troubleshooting

- **"address already in use"**: something else is on port 4000 or 5173. Run the API on another port with
  `PORT=4001 yarn workspace presight-server dev`, and point the client at it with
  `API_URL=http://localhost:4001 yarn workspace presight-client dev`.
- **First `docker compose up --build` is slow**: it downloads the base images and installs dependencies. Later builds use the cache.
- **Empty list locally**: run `yarn seed`; the database file doesn't exist until you do.

---

# Original brief

# Presight Frontend Exercise

Build a small full-stack user directory application. The goal is to evaluate how you design a searchable, filterable, paginated UI backed by persisted data and clear API boundaries.

The application should include:

- A React client.
- A Node.js API server.
- A SQLite database used as the source of truth for user data.
- Docker configuration for running the application locally.

## Scenario

Users need to browse a large directory of people, search by name, and narrow results by nationality and hobbies. The filter sidebar should help users discover useful filters based on the result set they are currently viewing.

## Requirements

### Data Model

Seed a SQLite database with enough records to make pagination, infinite scroll, search, and filter counts meaningful.

Each user should have:

- `avatar`
- `first_name`
- `last_name`
- `age`
- `nationality`
- `hobbies`, from 0 to 10 hobbies per user

Choose a data model that supports the required behavior.

SQLite must be the persisted source of user data.

### API

Expose an API that supports:

- Paginated user results.
- Text filtering from user input across `first_name` and `last_name`.
- Filtering by one or more nationalities.
- Filtering by one or more hobbies.
- Sorting by `first_name`, `last_name`, `age`, and `nationality`.
- Pagination metadata so the client can determine whether more results are available.
- Top 20 hobbies for the active text filter and filter state, including `{ value, count }`.
- Top 20 nationalities for the active text filter and filter state, including `{ value, count }`.

The top 20 values and counts must reflect the currently applied text filter and selected filters, not the global dataset.

Filter semantics:

- Multiple selected hobbies should match users who have all selected hobbies.
- Multiple selected nationalities should match users from any selected nationality.
- Text, hobby, and nationality filters should apply together.

Sorting semantics:

- Sorted results must be deterministic. Use `id` as a final tie-breaker when values are equal.
- Pagination must respect the active sort without duplicate or missing users.

### Client

Build a React interface that includes:

- A text filter input for `first_name` and `last_name`.
- A virtualized, infinitely scrolling list of user cards.
- A sidebar containing the top 20 hobbies and top 20 nationalities for the current result set, including counts.
- Controls for applying and removing hobby and nationality filters.
- Controls for choosing sort field and sort direction.
- Loading, empty, and error states.
- A responsive layout that remains usable on desktop and mobile.

User cards should follow this structure:

```text
|----------------------------------|
| avatar      first_name+last_name |
|             nationality      age |
|                                  |
|             (2 hobbies) (+n)     |
|----------------------------------|
```

Show up to 2 hobbies on the card. If the user has more hobbies, display the remaining count as `+n`.

Use a virtual scroll implementation for the list.

When the text filter or selected filters change, the client must refresh both:

- The paginated user list.
- The top 20 hobbies and nationalities in the sidebar.

The text filter value, selected hobbies, selected nationalities, sort field, and sort direction must be reflected in the URL query string. Reloading or sharing the URL should restore the same view state.

## Implementation Notes

- Keep the database setup easy to run locally.
- Include seed logic or a documented command that creates the SQLite database.
- Include a `Dockerfile` and `docker-compose.yml` that can run the application locally.

## Evaluation Focus

We will pay particular attention to:

- Correct data persistence and API behavior.
- Correct filtering, sorting, pagination, and top 20 counts.
- Smooth infinite scrolling with virtualization.
- URL-synced state.
- Clear loading, empty, and error states.
- Easy local and Docker-based setup.

## Deliverables

Please provide:

- Source code for the React client and Node.js server.
- A `Dockerfile` and `docker-compose.yml`.
- Instructions for setup, database seeding, and running locally.
- Instructions for running with Docker Compose.
