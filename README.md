# ETF Titan

### Introduction

ETF Titan is a full-stack single-page web application that allows traders to upload ETF constituent data, reconstruct ETF prices from historical constituent prices, and explore the results through a compact interactive dashboard. The core functionalities include:
- Display an interactive constituent table with name, weight and latest close price
- Reconstruct the ETF price as the weighted sum of constituent prices over time
- Visualize the reconstructed ETF price with a zoomable time series chart
- Highlight the top 5 holdings based on the latest market close using a bar chart

---
### Tech Stack & Structure
Frontend: React + Vite + Tamagui

Backend: Python + FastAPI + Pandas

Repository layout:
- `apps/web`: React client for the single-page trading interface
- `apps/server`: FastAPI backend for CSV ingestion and ETF analytics
- `packages/shared`: Shared monorepo files such as the Tamagui theme config, without separate package manifests

---
### To Get Started
Ensure you have `bun` `1.3.12` and `python3` installed.
```bash
bun --version
# Expected 1.3.12
```

Install all frontend and backend dependencies from the repository root:
```bash
bun run setup
```

Run the frontend and backend together from the repository root on localhost only:
```bash
bun run dev
```

Expose the frontend and backend to other devices on your LAN only when needed:
```bash
bun run dev:LAN
```

Or run them separately on localhost:
```bash
bun run dev:web
```

```bash
bun run dev:api
```

LAN-specific per-service commands are also available:
```bash
bun run dev:web:LAN
```

```bash
bun run dev:api:LAN
```
