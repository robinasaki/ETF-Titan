# Scripts
Here are the scripts for easier development. Might be useful for containerization in the future too.

### `Setup.sh`
This runs `bun install` for the web module and `pip install -r` for the server module.
```bash
# This is included in the bun cmd
bun run setup
```

### `Dev.sh`
This starts both the FastAPI backend and the React frontend development server.
```bash
# This is included in the bun cmd
bun run dev
```