# `server/app/repositories/`
This folder contains the backend data access layer for ETF datasets.
It is responsible for loading CSV data from disk, normalizing it into validated Pandas DataFrames, and managing the temp-to-perm upload flow used by the API.

### Responsibilities
- Load the bundled ETF weights files from `server/storage/default/`
- Load the bundled historical files from `server/storage/default/prices.csv`
- Parse the uploaded ETF weights and prices CSV files from disk
- Validate CSV structure and data quality before the server layer uses the data
- Stage uploads in `server/storage/tmp/` and persist validated files into `server/storage/uploads/`

## Key Behaviours
### Cached default datasets
Built-in datasets are cached in memory with `lru_cache` to avoid repeated disk reads and CSV parsing during local API usage.
This caching applies only to the default server-side files:
- `ETF1.csv`
- `ETF2.csv`
- `prices.csv`
Uploaded CSV files are validated and parsed from disk on demand and are not cached.

### Upload staging
Uploaded files are first written into `server/storage/tmp`.

They are validated from the disk before being prompted into `server/storage/uploads/`.

### Validation and normalization
The repository layer normalizes input CSVs into a predictable shape before returning them upward.

ETF weight files are validated for:
- require `name` and `weight` columns
- non-empty data
- blank constituent names
- non-numeric weights
- negative weights

Historical priices files are validated for:
- required `DATE` column
- at least one price column
- duplicate columns
- invalid dates
- blank constituent symbols
- non-numeric price values

### Design notes
- ETF ids are resolved through a fixed allowlist instead of arbitary file paths.
- Constituent names are normalized to uppercase.
- Price rows are sorted by date before being returned.
- This layer focuses only on file access, parsing and validation; ETF calculations belong in the service layer.
- Because the user can freely upload custom CSVs and the given CSVs don't have sensitive data, I included them in the repo.

### Main module
- `csv_repository.py`: CSV-backed repository functions, upload staging helpers, and dataset validation logic