# ETF Titan

ETF Titan is a single-page ETF analytics app built for the take-home exercise.

It lets a user upload ETF weights CSV files, then view holdings, reconstructed ETF prices, and top holdings derived from bundled local constituent price history.

This README contains shared-level documentation. More details are in `apps/server/README.md` and `apps/web/README.md`.

<img width="1342" height="1667" alt="Screenshot 2026-04-19 at 05 16 56" src="https://github.com/user-attachments/assets/cf14509c-dab6-465f-81d5-d052a5e099ac" />


## Product Scope

- Upload any ETF weights CSV for analysis while reusing the bundled `prices.csv`
- View a holdings table with constituent name, weight, latest close, and latest holding value
- Reconstruct ETF price history from constituent price history
- Color the price-series line by the selected brush window trend (green if end price is above start price, otherwise red)
- Highlight the top 5 holdings by latest holding value
- Run entirely from local repository data without any external market data API

## Tech Stack

- Frontend: React, Vite, Tamagui
- Backend: FastAPI, Pandas
- Tooling: Bun, TypeScript, Python unittest, TypeScript Vitest

*Why the stack?*

For the frontend, I chose React because of its component-driven UI model and my familiarity with it. Vite is a straightforward choice for local development in a single-page application. I used Tamagui to centralize color and theme tokens from the start. Combined with the repository/frontend structure below, this gives us a near single source of truth for UI tokens.

For a backend non-relational ETL workflow, Pandas is a very straightforward solution: we do not need a DB schema, and the input is local CSV data where the core task is dataframe-style transformation and analytics, which Pandas handles naturally without a separate DB layer. Compared to Flask, FastAPI provides stronger typing and schema support out of the box, plus better async support.

Bun is my preferred TypeScript runtime. Compared to a traditional runtime like Node.js, it is faster, does more out of the box, and includes many built-in features.

## Repository Structure

- `apps/web`: React + Vite + Tamagui frontend
- `apps/server`: FastAPI + Pandas backend
- `packages/shared`: shared frontend config such as Tamagui theme files
- `scripts`: repo-level setup, dev, test, and load-test entrypoints

*Why the structure?*

We used a monorepo for scalability and maintainability.

For example, if the product grows to a mobile client, we can add `apps/mobile` without reorganizing the codebase. This structure clearly separates private app code from intentionally shared code: `apps/*` contains app-specific implementation, while `packages/shared` contains cross-app config such as Tamagui theme tokens.

This gives us cleaner ownership boundaries, easier reuse, less duplication, and simpler cross-app development as the platform expands.

## Assumptions

- The project is intentionally scoped to a local take-home environment, so auth and external market data integrations are out of scope.
- Bundled sample datasets are treated as non-sensitive local fixtures for development.
- No packaging or containerization work is required for the current scope.
- Currency handling is fixed to USD with no conversion layer.
- The user can upload only ETF CSVs following the given format, and cannot commit updates or delete operations.
- No GitHub Action automated testing for the scope of this project.
- Implementation-specific assumptions are intentionally split by app:
  - backend assumptions: `apps/server/README.md`
  - frontend assumptions: `apps/web/README.md`

## Bundled Data

The repo includes only the bundled constituent prices CSV at `apps/server/storage/prices/prices.csv`.

Uploaded ETF weights are stored under `apps/server/storage/uploads/` after backend validation and are renamed to `ETF{n}.csv`.


## Backend Overview

The backend exposes:

- `GET /health`
- `GET /etfs`
- `GET /etfs/{etf_id}/holdings`
- `GET /etfs/{etf_id}/price-series`
- `GET /etfs/{etf_id}/top-holdings`
- `POST /etfs/upload`

See `apps/server/README.md` for backend-specific behavior and `apps/server/app/routers/README.md` for route-level notes.

## Getting Started

For this project, we're using Bun 1.3.12, Python 3.13.5 and pip 25.1. The TypeScript version is included in the `bun.lock` frozen lock.

From the repository root:

```bash
bun run setup
# This installs the dependencies for both TS and Python
```

Start the full stack locally:

```bash
bun run dev
# Vite should log the localhost URL here
```

---

Run frontend and backend separately if needed:

```bash
bun run dev:web
bun run dev:api
```

LAN variants are also available:

```bash
bun run dev:LAN
# This exposes your page to all LAN devices
# Useful when testing the frontend in different environments
```

Run frontend and backend LAN variants separately if needed:

```bash
bun run dev:web:LAN
bun run dev:api:LAN
```

By default the backend serves on `http://127.0.0.1:8000`.

## Testing

Run the standard repo verification from the repository root:

```bash
bun run test
```

This runs:

- frontend workspace type checking
- backend unit tests discovered from `apps/server/tests` with the `test*.py` pattern

The dedicated load test is intentionally separate from the normal test suite:

```bash
bun run load
```

That command regenerates max-valid ETF CSV fixtures from bundled `prices.csv` symbols and runs only the backend load-focused test file.
The load upload artifact is intentionally retained in `apps/server/storage/uploads/` after success; run `bun run clear` when you want to remove server upload buckets.
