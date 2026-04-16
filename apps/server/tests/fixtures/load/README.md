## Backend Load Fixtures

This directory contains deterministic synthetic CSV fixtures for the backend upload load tests.

- `ETF1.csv`: 1200 constituent weights
- `ETF2.csv`: 1200 constituent weights
- `prices.csv`: 7200 dates across 240 symbols

Regenerate the fixtures from the repository root with:

```bash
python3 apps/server/tests/fixtures/load/generate_large_csvs.py
```

Run only the backend load test from the repository root with:

```bash
bun run load test
```
