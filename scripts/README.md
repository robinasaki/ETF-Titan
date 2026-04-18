# Scripts
Here are the scripts for easier development. Might be useful for containerization in the future too.

### `setup.sh`
This runs `bun install` for the web module and `pip install -r` for the server module.
```bash
# This is included in the bun cmd
bun run setup
```

### `dev.sh`
This starts both the FastAPI backend and the React frontend development server.
```bash
# This is included in the bun cmd
bun run dev
```

### `test.sh`
This runs all non-load tests. Both Pytest and Vitest.
```
bun run test
```

### `kill.sh`
Upon a stale Python backend (mostly happening during development), this clears the wanted backend port.
```bash
bun run kill
```

### `load-test.sh`
This load tests the upload pipeline with the largest ETF csv possible given the `prices.csv`.
```
bun run load
```

### `clear.sh`
This clears the server-side ETF CSV storage.
```
bun run clear
```