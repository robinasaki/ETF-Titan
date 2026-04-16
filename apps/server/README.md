## ETF Titan API

This backend exposes a small FastAPI service for ETF analytics over bundled or uploaded CSV datasets. It is intentionally thin: routing, upload validation, and error mapping live close to the API surface, while parsing and ETF calculations live in repository and service modules.

## Responsibilities

- Serve the built-in ETF catalog from local CSV data
- Return holdings snapshots, reconstructed price series, and ranked top holdings
- Accept a strict three-file upload bundle for ad hoc ETF analysis
- Validate CSV structure and stage uploads safely before persistence
- Keep the API local-only and minimal for the take-home scope

## API Routes

- `GET /health`
- `GET /etfs`
- `GET /etfs/{etf_id}/holdings`
- `GET /etfs/{etf_id}/price-series`
- `GET /etfs/{etf_id}/top-holdings?limit=5`
- `POST /etfs/upload`

## Data Flow

For built-in ETF requests:

1. The router receives an ETF id.
2. The service layer loads the corresponding built-in weights CSV plus the default prices CSV.
3. The service aligns prices to symbols, computes holdings metrics, and serializes the response.

For upload analysis:

1. The router validates filename and content type constraints.
2. Uploaded files are streamed into temporary staged files.
3. The service parses the staged CSVs and computes holdings, price series, and top holdings.
4. Validated uploads are promoted into `apps/server/storage/uploads/`.
5. Temporary staged files are cleaned up whether the call succeeds or fails.

## Upload Contract

`POST /etfs/upload` requires multipart form data with exactly these logical files:

- `etf1_file`: must be named `ETF1.csv`
- `etf2_file`: must be named `ETF2.csv`
- `prices_file`: must be named `prices.csv`

Expected shapes:

- ETF weights CSVs: `name,weight`
- Prices CSV: `DATE,...symbols`

The upload endpoint also accepts a `limit` query param for top holdings, constrained to `1..10`.

## Assumptions

- The backend serves only the built-in `ETF1` and `ETF2` datasets for catalog-style requests.
- Uploaded analysis still assumes the same three logical file names: `ETF1.csv`, `ETF2.csv`, and `prices.csv`.
- ETF weights are effectively static across the price history window.
- ETF price reconstruction is a row-wise weighted sum of constituent close prices.
- The latest market snapshot comes from the last dated row after prices are normalized and sorted.
- Top holdings are ranked by `weight * latest_close`, with stable tie-breakers applied in code.
- ETF weight totals are validated with a tolerance because sample inputs may sum to approximately `1.0`, not perfectly.
- The API is local-development-focused and does not implement authentication.

## Validation and Safety Notes

- ETF ids are resolved through a fixed allowlist rather than arbitrary file paths.
- Uploads must use a `.csv` extension and an allowed CSV content type.
- Uploads are written to disk in chunks instead of being buffered fully in memory.
- Uploaded CSV parsing validates required columns, numeric coercion, duplicate symbols, and symbol coverage in prices data.
- Temporary staged files live in `apps/server/storage/tmp/`.
- Validated uploaded files are stored in `apps/server/storage/uploads/`.
- Error responses avoid leaking internal filesystem paths.
- CORS is restricted to local frontend origins on `localhost` and `127.0.0.1`.

## Local Development

From the repository root:

```bash
bun run setup
bun run dev:api
```

The API runs on `http://127.0.0.1:8000` by default.

Useful verification commands:

```bash
bun run test
```

```bash
bun run load test
```

`bun run test` excludes the dedicated load suite. `bun run load test` regenerates large synthetic CSVs and runs only the backend load-focused test file.

## Example Requests

Fetch the ETF catalog:

```bash
curl "http://127.0.0.1:8000/etfs"
```

Fetch top holdings for a built-in ETF:

```bash
curl "http://127.0.0.1:8000/etfs/ETF1/top-holdings?limit=5"
```

Upload the bundled sample files:

```bash
curl -X POST "http://127.0.0.1:8000/etfs/upload?limit=5" \
  -F "etf1_file=@apps/server/storage/default/ETF1.csv" \
  -F "etf2_file=@apps/server/storage/default/ETF2.csv" \
  -F "prices_file=@apps/server/storage/default/prices.csv"
```
