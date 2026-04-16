## ETF Titan API

This backend exposes a small FastAPI service over the bundled ETF sample datasets in `apps/server/storage/default/` and supports a minimal CSV upload flow for ad hoc ETF analysis.

### Implemented functionality

- Return the supported ETF sample ids
- Return a holdings snapshot with constituent name, weight, latest close, and latest holding value
- Reconstruct the ETF price series as the weighted sum of constituent prices
- Return the top holdings ranked by latest holding value
- Analyze an uploaded ETF weights CSV, with an optional uploaded prices CSV

### API routes

- `GET /health`
- `GET /etfs`
- `GET /etfs/{etf_id}/holdings`
- `GET /etfs/{etf_id}/price-series`
- `GET /etfs/{etf_id}/top-holdings?limit=5`
- `POST /etfs/upload`

### Sample responses

`GET /etfs`

```json
{
  "items": [
    { "id": "ETF1", "constituent_count": 15 },
    { "id": "ETF2", "constituent_count": 20 }
  ]
}
```

`GET /etfs/ETF1/holdings`

```json
{
  "etf_id": "ETF1",
  "latest_date": "2017-04-10",
  "items": [
    {
      "name": "Z",
      "weight": 0.097,
      "latest_close": 53.699,
      "latest_holding_value": 5.208803
    }
  ]
}
```

`POST /etfs/upload`

Use multipart form data:

- `etf_file`: required ETF weights CSV shaped like `ETF1.csv` / `ETF2.csv`
- `prices_file`: optional prices CSV shaped like `prices.csv`

Accepted upload filenames:

- ETF weights file: `ETF1.csv` or `ETF2.csv`
- Prices file: `prices.csv`

```json
{
  "source": "upload",
  "etf_file_name": "ETF1.csv",
  "prices_source": "default prices.csv",
  "latest_date": "2017-04-10",
  "holdings": [
    {
      "name": "Z",
      "weight": 0.097,
      "latest_close": 53.699,
      "latest_holding_value": 5.208803
    }
  ],
  "price_series": [
    {
      "date": "2017-01-01",
      "price": 60.819261
    }
  ],
  "top_holdings_limit": 5,
  "top_holdings": [
    {
      "name": "F",
      "weight": 0.146,
      "latest_close": 49.101,
      "latest_holding_value": 7.168746
    }
  ]
}
```

### Assumptions

- The backend serves the built-in `ETF1` and `ETF2` datasets and can also analyze uploaded ETF weights CSV files.
- The latest market close is the last dated row in `apps/server/storage/default/prices.csv`.
- ETF price reconstruction uses a row-wise weighted sum of constituent prices.
- Top holdings are ranked by `weight * latest_close`.
- Weight totals are validated with a small tolerance because the sample files sum to approximately `1.0`, not exactly.
- Uploaded ETF files must follow the `name,weight` shape used by `ETF1.csv` and `ETF2.csv`.
- Optional uploaded prices files must follow the `DATE,...symbols` shape used by `prices.csv`.
- Uploaded filenames must match the allowed server-side names exactly: `ETF1.csv`, `ETF2.csv`, or `prices.csv`.

### Security and validation

- ETF ids are resolved through a fixed allowlist instead of user-supplied file paths.
- The API intentionally does not implement auth for this local take-home scope.
- Uploads are streamed into temporary server-side staging files, validated from disk, and only then promoted into permanent storage.
- The upload route accepts `.csv` files only and validates allowed CSV content types.
- The upload route also validates exact allowed filenames before processing.
- Uploads are streamed to disk in chunks instead of being buffered fully in memory.
- Only the built-in default CSV loaders are cached in memory. Uploaded CSV parsing is not cached.
- CSV parsing validates required columns, numeric fields, duplicate symbols, and missing price coverage.
- CORS is limited to local frontend origins on `localhost` and `127.0.0.1`.
- Error responses avoid exposing internal filesystem paths.
- Default bundled datasets live in `apps/server/storage/default/`.
- Temporary staged uploads live in `apps/server/storage/tmp/` during validation.
- Validated uploads are stored in `apps/server/storage/uploads/` and overwrite prior files with the same allowed name.

### Local development

From the repository root:

```bash
bun run setup
bun run dev:api
```

The API runs on `http://127.0.0.1:8000` by default.

Example upload request:

```bash
curl -X POST "http://127.0.0.1:8000/etfs/upload?limit=5" \
  -F "etf_file=@apps/server/storage/default/ETF1.csv" \
  -F "prices_file=@apps/server/storage/default/prices.csv"
```
