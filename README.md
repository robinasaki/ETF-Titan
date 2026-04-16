# ETF Titan

ETF Titan is a single-page ETF analytics app built for the take-home exercise.

It lets a user inspect bundled ETF sample data or upload a single ETF weights CSV, then view holdings, reconstructed ETF prices, and top holdings derived from the bundled local constituent price history.

## Product Scope

- Upload `ETF1.csv` or `ETF2.csv` for analysis while reusing the bundled `prices.csv` (or use the default, pre-loaded ones)
- View a holdings table with constituent name, weight, latest close, and latest holding value
- Reconstruct ETF price history from constituent price history
- Highlight the top 5 holdings by latest holding value
- Run entirely from local repository data without any external market data API

## Tech Stack

- Frontend: React, Vite, Tamagui
- Backend: FastAPI, Pandas
- Tooling: Bun, TypeScript, Python `unittest`

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

- ETF weights are treated as static over time.
- ETF reconstruction is the weighted sum of constituent prices for each date.
- The latest ETF snapshot is derived from the last available row in `prices.csv`.
- `prices.csv` is the single source of truth for symbol prices.
- The pre-loaded datasets are not sensitive. (I pushed them to repo for less setup, in a real project, I'd be careful with what data to push to repo.)
- Uploaded ETF data follows the same CSV shape as the bundled ETF fixtures.
- The app is intentionally scoped to a local take-home environment, so auth and external data integrations are out of scope.

## Bundled Data

The repo includes sample non-sensitive CSVs under `apps/server/storage/default/`:

- `ETF1.csv`
- `ETF2.csv`
- `prices.csv`

These files allow the app to run immediately after setup. The ETF sample files also act as the canonical shape for uploaded ETF CSV validation, while the bundled `prices.csv` remains the shared historical price source.


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
bun run load test
```

That command regenerates large synthetic CSV fixtures and runs only the backend load-focused test file.
