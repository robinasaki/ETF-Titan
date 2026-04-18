## ETF Titan API

This backend exposes a small FastAPI service for ETF analytics over user-uploaded ETF weights CSV datasets and bundled constituent prices. It is intentionally thin: routing, upload validation, and error mapping live close to the API surface, while parsing and ETF calculations live in repository and service modules.

## Responsibilities

- Serve an ETF catalog from validated uploaded CSV files
- Return holdings snapshots, reconstructed price series, and ranked top holdings
- Accept a single ETF weights upload for ad hoc ETF analysis
- Validate CSV structure and stage uploads safely before persistence
- Keep the API local-only and minimal for the take-home scope

## API Routes

- `GET /health`
- `GET /etfs`
- `GET /etfs/{etf_id}/holdings`
- `GET /etfs/{etf_id}/price-series`
- `GET /etfs/{etf_id}/top-holdings?limit=5`
- `POST /etfs/upload`
- `GET /etfs/subscribe`

## Data Flow

For ETF requests:

1. The router receives an ETF id.
2. The service layer loads the corresponding uploaded weights CSV plus the bundled prices CSV.
3. The service aligns prices to symbols, computes holdings metrics, and serializes the response.

For upload analysis:

1. The router validates CSV extension and content type constraints.
2. The uploaded ETF CSV is streamed into a temporary staged file.
3. The service loads the bundled `prices.csv`, parses the staged ETF CSV, and computes holdings, price series, and top holdings.
4. The validated ETF upload is promoted into `apps/server/storage/uploads/` as `ETF{n}.csv`.
5. The backend publishes an upload-complete event through a lightweight in-memory pub/sub queue used by the SSE endpoint.
6. The temporary staged file is cleaned up whether the call succeeds or fails.

## Upload Event Delivery

The upload flow uses two subscription layers:

1. **Server-internal pub/sub** (`app/services/etf_events.py`)
   - `subscribe_etf_events()` registers one `asyncio.Queue` per subscriber.
   - `publish_etf_uploaded_event(...)` fans out an upload-complete payload to all current queues.
2. **Client-facing SSE subscription** (`GET /etfs/subscribe`)
   - `subscribe_to_etf_events(...)` bridges one queue to a streaming HTTP response (`text/event-stream`).
   - Each queued payload is emitted as `event: etf_uploaded` for browser `EventSource` listeners.
   - A periodic keepalive event is emitted when no upload event arrives within the timeout window.

End-to-end upload notification sequence:

1. Frontend opens `EventSource("/etfs/subscribe")` (long-lived SSE connection).
2. Frontend posts `POST /etfs/upload` with multipart CSV data.
3. Backend stages, validates, analyzes, and persists the upload.
4. Backend publishes `etf_uploaded` to in-memory subscribers.
5. `/etfs/subscribe` forwards that payload over SSE to connected frontend listeners.
6. Frontend listener refreshes catalog state after receiving `etf_uploaded`.

Notes:

- The uploader receives the normal upload HTTP response directly; SSE is used for live refresh notifications (including other connected tabs/clients).
- Pub/sub is process-local and non-persistent (no replay if a client is disconnected).

## Upload Contract

`POST /etfs/upload` requires multipart form data with exactly this file:

- `etf_file`: any `.csv` filename is accepted

Expected shapes:

- ETF weights CSV: `name,weight`
- Bundled prices CSV (`apps/server/storage/prices/prices.csv`): `DATE,...symbols`

The upload endpoint also accepts a `limit` query param for top holdings, constrained to `1..10`.

## Assumptions

- The backend serves only ETFs that have been uploaded and validated.
- Uploaded analysis accepts one ETF weights file at a time and always uses the bundled `prices.csv`.
- ETF weights are effectively static across the price history window.
- ETF price reconstruction is a row-wise weighted sum of constituent close prices.
- The latest market snapshot comes from the last dated row after prices are normalized and sorted.
- Top holdings are ranked by `weight * latest_close`, with stable tie-breakers applied in code.
- ETF weight totals are validated with a tolerance because sample inputs may sum to approximately `1.0`, not perfectly.
- The API is local-development-focused and does not implement authentication.

## Validation and Safety Notes

- ETF ids are resolved from persisted uploaded ETF files.
- Uploads must use a `.csv` extension and a CSV content type.
- Uploads are written to disk in chunks instead of being buffered fully in memory.
- Uploaded ETF CSV parsing validates required columns, numeric coercion, duplicate symbols, and symbol coverage in prices data.
- Temporary staged files live in `apps/server/storage/tmp/`.
- Validated uploaded ETF files are stored in `apps/server/storage/uploads/`.
- Upload notifications use a lightweight in-memory pub/sub event fanout (process-local, non-persistent) for `GET /etfs/subscribe`.
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

`bun run test` excludes the dedicated load suite. `bun run load` regenerates max-valid ETF fixtures (derived from `prices.csv` symbols) and runs only the backend load-focused test file.
The load suite intentionally keeps the successful uploaded ETF CSV under `apps/server/storage/uploads/` for manual inspection; clear artifacts with `bun run clear`.

## Example Requests

Fetch the ETF catalog:

```bash
curl "http://127.0.0.1:8000/etfs"
```

Fetch top holdings for a built-in ETF:

```bash
curl "http://127.0.0.1:8000/etfs/ETF1/top-holdings?limit=5"
```

Upload one bundled sample ETF file:

```bash
curl -X POST "http://127.0.0.1:8000/etfs/upload?limit=5" \
  -F "etf_file=@apps/server/tests/fixtures/load/ETF1.csv"
```
