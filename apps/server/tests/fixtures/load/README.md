## Backend Load Fixtures

This directory contains deterministic ETF weights CSV fixtures for backend upload load tests.

- `ETF1.csv`: first half of symbols from bundled `prices.csv`
- `ETF2.csv`: all symbols from bundled `prices.csv` (largest valid upload)

During `bun run load test`, fixtures are regenerated from the current `apps/server/storage/prices/prices.csv` symbol header. A successful upload is intentionally persisted into `apps/server/storage/uploads/` so you can inspect load-upload artifacts after the run.

To clear staged/uploaded server CSV artifacts manually, run from the repository root:

```bash
bun run clear
```

Regenerate the fixtures from the repository root with:

```bash
python3 apps/server/tests/fixtures/load/generate_large_csvs.py
```

Run only the backend load test from the repository root with:

```bash
bun run load test
```
