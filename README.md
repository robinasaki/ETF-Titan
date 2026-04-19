# ETF Titan

ETF Titan is a single-page ETF analytics app built for the take-home exercise.

It lets a user upload ETF weights CSV files, then view holdings, reconstructed ETF prices, and top holdings derived from bundled local constituent price history.

This README contains only the shared-level documentation. More documentations can be found in `apps/server/README.md` and `apps/web/README.md`.

<img width="1355" height="1615" alt="Screenshot 2026-04-18 at 21 04 26" src="https://github.com/user-attachments/assets/be56faa2-35a7-426e-88de-251d4e775a1a" />

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

For frontend, I decided to use React because of its component-driven UI and my familiarity. Vite is a straightforward framework for this single-page application local dev. I used Tamagui because it is a good practice to centralize the colour and theme tokens from the very start of the project. Combined with the below repo & frontend structure, we can have almost one single source of truth for the UI tokens.

For a backend non-relational ETL, Pandas is a very striaght forward solution: We don't need any DB definition, and the input is just local CSV data and the core task is dataframe-style transformation and analytics, which Pandas handles more naturally than a separate DB layer. Then, compared to Flask, FastAPI gives stronger typing and schema support out of the box, and is better at async support.

Then, Bun, my favourite TS engine. Compare to traditional engine like NodeJS, it is faster, does more things, and comes with a lot of pre-loaded functionalities.

## Repository Structure

- `apps/web`: React + Vite + Tamagui frontend
- `apps/server`: FastAPI + Pandas backend
- `packages/shared`: shared frontend config such as Tamagui theme files
- `scripts`: repo-level setup, dev, test, and load-test entrypoints

*Why the structure?*

We used a monorepo for scalability and maintainability.

For example, if the product grows to a mobile client, we can add `apps/mobile` without organizing the codebase. This structure clearly separates private app code from intentionally shared code: `apps/*` contains app-specific implementation, while `package/shared` contains cross-app config such as Tamagui theme tokens.

This gives us cleaner ownership boundaries, easier reuse, less duplication, and simpler cross-app development as the platform expands.

## Assumptions

- The project is intentionally scoped to a local take-home environment, so auth and external market data integrations are out of scope.
- Bundled sample datasets are treated as non-sensitive local fixtures for development.
- No packaging or containerization work is required for the current scope.
- Currency handling is fixed to USD with no conversion layer.
- The user can upload only ETF CSVs following the given format, and cannot commit updates or delete operations.
- I also didn't add any GitHub actions for testing because I don't want to pay.
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

For this project, we're using Bun 1.3.12, Python 1.13.5 and pip 25.1. The TypeScript version is included in the `bun.lock` frozen lock.

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
# Useful when testing frontend in diff envs
```

And the frontend backend separately if needed:

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
