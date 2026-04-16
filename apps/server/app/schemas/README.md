# `server/app/schemas`

This directory contains the backend API schemas.

## Current schema file

- `etf.py`: The actual schema model

The main models in `etf.py` are:
- `EtfCatalogItem` and `EtfCatalogResponse`: supported ETF list responses
- `HoldingSnapshotItem` and `HoldingsResponse`: holdings table responses
- `PriceSeriesPoint` and `PriceSeriesResponse`: reconstructed price-series responses
- `TopHoldingsResponse`: ranked top-holdings response
- `UploadedEtfAnalyticsResponse`: analytics for one uploaded ETF file

## Design choices

- Small reusable models such as `HoldingSnapshotItem` and `PriceSeriesPoint` are shared across multiple responses to avoid duplicating the same payload shape.
- Collection responses use wrapper models like `HoldingsResponse` and `PriceSeriesResponse` instead of returning raw arrays so the API can include metadata such as `etf_id`, `latest_date`, and `limit`.
- The `source` field on uploaded responses is constrained to the literal value `upload`. Although this is technically useless in this setting, it would be useful for future scalability.
