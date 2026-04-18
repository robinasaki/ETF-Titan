## Routers

The `app/routers` package defines the FastAPI route layer for the backend. 

In this project, the router layer stays intentionally small and focuses on HTTP concerns rather than ETF calculation logic.

## Current Router Modules

- `etfs.py`: ETF catalog, holdings, price-series, top-holdings, and upload routes

## Router Responsibilities

- Define public API paths, methods, and response models
- Validate request-level inputs such as query params, filenames, and content types
- Stream uploaded ETF weights files into temporary staged storage
- Translate service and repository exceptions into stable HTTP responses
- Keep business logic delegated to `app/services`

## `etfs.py` Notes

The ETF router is mounted at the `/etfs` prefix and currently serves:

- `GET /etfs`
- `GET /etfs/{etf_id}/holdings`
- `GET /etfs/{etf_id}/price-series`
- `GET /etfs/{etf_id}/top-holdings`
- `POST /etfs/upload`

The upload route is the only async route in this package because it streams an uploaded ETF CSV to disk before calling the service layer.

## Assumptions

- Routers should stay thin and task-focused.
- HTTP validation belongs here; ETF calculations belong in `app/services/etf_service.py`.
- Upload handling accepts any single ETF weights CSV filename and persists it as `ETF{n}.csv` after validation.
- Router error handling should expose user-meaningful validation messages without leaking internal paths or low-level exceptions.
- This package is expected to remain small unless more API surfaces are added.
