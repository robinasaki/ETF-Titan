## Backend Load Fixtures

This directory contains deterministic synthetic CSV fixtures for the backend upload load tests.

- `ETF1.csv`: 1200 constituent weights
- `ETF2.csv`: 1200 constituent weights

During `bun run load test`, the test builds a large synthetic prices frame in memory and patches the bundled price loader to return it. Only the ETF weights CSV fixtures are written to disk.

Regenerate the fixtures from the repository root with:

```bash
python3 apps/server/tests/fixtures/load/generate_large_csvs.py
```

Run only the backend load test from the repository root with:

```bash
bun run load test
```
