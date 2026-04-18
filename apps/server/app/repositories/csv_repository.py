from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import re
from uuid import uuid4

import pandas as pd
from pandas.errors import ParserError

"""
Construct the directory path.
"""
REPO_ROOT = Path(__file__).resolve().parents[4]
STORAGE_DIR = REPO_ROOT / "apps" / "server" / "storage"
PRICES_DATA_DIR = STORAGE_DIR / "prices"
PRICES_FILE = PRICES_DATA_DIR / "prices.csv"
TEMP_UPLOADS_DIR = STORAGE_DIR / "tmp"
UPLOADS_DIR = STORAGE_DIR / "uploads"

# ETF{n}.csv
ETF_UPLOAD_FILENAME_PATTERN = re.compile(r"^ETF\d*\.csv$")
ETF_ID_PATTERN = re.compile(r"^ETF\d*$")


class UnknownEtfError(ValueError):
    """Raised when an ETF id cannot be resolved to an uploaded ETF CSV."""


class DatasetValidationError(ValueError):
    """Raised when one of the required CSV files is malformed."""


def get_supported_etf_ids() -> tuple[str, ...]:
    """Return all uploaded ETF ids currently persisted on disk."""
    return tuple(path.stem.upper() for path in list_uploaded_etf_files())


def list_uploaded_etf_files() -> tuple[Path, ...]:
    """Return ETF upload files sorted by numeric ETF id.
    
    response:
    ```
    (Path(".../uploads/ETF1.csv"), Path(".../uploads/ETF3.csv"), Path(".../uploads/ETF10.csv"))
    ```
    """
    if not UPLOADS_DIR.exists():
        return ()

    valid_files: list[tuple[int, Path]] = []
    for path in UPLOADS_DIR.iterdir():
        if not path.is_file():
            continue
        if not ETF_UPLOAD_FILENAME_PATTERN.fullmatch(path.name):
            continue

        etf_number = _extract_etf_number_from_name(path.name)
        valid_files.append((etf_number, path))

    return tuple(path for _, path in sorted(valid_files, key=lambda item: item[0]))


def resolve_uploaded_etf_file_path(etf_id: str) -> Path:
    """Ensure the ETF id follows the ETF CSV regex, and the file actually exist.
    This is mostly used for API call validation now. It ensures the dynamic routing var etf_id is properly defined, 
    and the CSV file actually exists.

    We don't directly call _require_existing_file() here because UnknownEtfError() and DatasetValidationError() should map to diff HTTP responses.
    """
    normalized_etf_id = etf_id.strip().upper()
    if not ETF_ID_PATTERN.fullmatch(normalized_etf_id):
        raise UnknownEtfError("ETF id is not supported.")

    candidate = UPLOADS_DIR / f"{normalized_etf_id}.csv"
    if not candidate.is_file():
        raise UnknownEtfError("ETF id is not supported.")
    return candidate


def get_next_uploaded_etf_filename() -> str:
    """Return the next ETF filename using max(existing ETF CSV id) + 1."""
    uploaded_files = list_uploaded_etf_files()
    highest_number = 0
    for path in uploaded_files:
        highest_number = max(highest_number, _extract_etf_number_from_name(path.name))
    return f"ETF{highest_number + 1}.csv"


def _require_existing_file(path: Path) -> None:
    """Given a full server path, checks if the required dataset is there.
    This is a guard, not a query. Thus it's a None/Error return, not a bool return.

    Usage:
    ```python
    _require_existing_file(Path("apps/server/storage/prices/prices.csv"))
    ```
    """
    if not path.is_file():
        raise DatasetValidationError("A required ETF dataset is missing.")


@lru_cache
def load_prices_frame() -> pd.DataFrame:
    """Load the bundled prices.csv into a pd.DataFrame.
    This is using in memory cache since the prices.csv is small and fixed.
    """
    _require_existing_file(PRICES_FILE)

    try:
        frame = pd.read_csv(PRICES_FILE, parse_dates=["DATE"])
    except (ParserError, ValueError) as exc:
        raise DatasetValidationError("Historical prices dataset could not be parsed.") from exc
    return _normalize_prices_frame(frame)


def load_etf_weights_frame(etf_id: str) -> pd.DataFrame:
    """Load one uploaded ETF weights CSV into a pd.DataFrame."""
    path = resolve_uploaded_etf_file_path(etf_id)

    try:
        frame = pd.read_csv(path)
    except (ParserError, ValueError) as exc:
        raise DatasetValidationError("ETF weights dataset could not be parsed.") from exc
    return _normalize_weights_frame(frame)


def create_staged_upload_path(filename: str) -> Path:
    """Create a unique temporary staging path for an incoming upload."""
    TEMP_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name
    return TEMP_UPLOADS_DIR / f"{uuid4().hex}-{safe_name}"


def cleanup_staged_upload(path: Path | None) -> None:
    """Delete a staged upload if it still exists."""
    if path is not None and path.exists():
        path.unlink()


def load_uploaded_etf_weights_frame(path: Path) -> pd.DataFrame:
    """Load a staged uploaded ETF weights CSV from disk."""
    _require_existing_file(path)

    try:
        frame = pd.read_csv(path)
    except (ParserError, ValueError, UnicodeDecodeError) as exc:
        raise DatasetValidationError("Uploaded ETF weights CSV could not be parsed.") from exc
    return _normalize_weights_frame(frame)


def persist_validated_upload(staged_path: Path) -> Path:
    """Promote a validated staged upload into permanent server-side storage."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    stored_file_path = UPLOADS_DIR / get_next_uploaded_etf_filename()
    staged_path.replace(stored_file_path)
    return stored_file_path


def _extract_etf_number_from_name(filename: str) -> int:
    """Obtain the n from ETF{n}.csv file name for sorting/allocation."""
    stem = Path(filename).stem.upper()
    digits = stem[3:]
    return int(digits) if digits else 0


def _normalize_weights_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """Normalize the weight df shape and content. Validate the df structure."""
    normalized_columns = {column: column.strip().lower() for column in frame.columns}
    frame = frame.rename(columns=normalized_columns)

    expected_columns = {"name", "weight"}
    if not expected_columns.issubset(frame.columns):
        raise DatasetValidationError("ETF weights dataset is missing required columns.")

    frame = frame.loc[:, ["name", "weight"]].copy()
    frame["name"] = frame["name"].astype(str).str.strip().str.upper()
    frame["weight"] = pd.to_numeric(frame["weight"], errors="coerce")

    # Is it empty?
    if frame.empty:
        raise DatasetValidationError("ETF weights dataset is empty.")
    
    # Does it contain blank symbol?
    if frame["name"].eq("").any():
        raise DatasetValidationError("ETF weights dataset contains blank constituent symbols.")

    # Does it contain a duplicate symbol?
    if frame["name"].duplicated().any():
        raise DatasetValidationError("ETF weights dataset contains duplicate constituent symbols.")

    # Does it have an invalid weight?
    if frame["weight"].isna().any():
        raise DatasetValidationError("ETF weights dataset contains invalid weights.")
    if (frame["weight"] < 0).any():
        raise DatasetValidationError("ETF weights dataset contains negative weights.")

    return frame.reset_index(drop=True)


def _normalize_prices_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """Normalize the prices df shape and content. Validate the df structure."""
    # Is it empty?
    if frame.empty:
        raise DatasetValidationError("Historical prices dataset is empty.")

    renamed_columns = {
        column: column.strip().upper() if column != "DATE" else "DATE"
        for column in frame.columns
    }
    frame = frame.rename(columns=renamed_columns)

    # Are all the dates filled?
    if "DATE" not in frame.columns:
        raise DatasetValidationError("Historical prices dataset is missing the DATE column.")

    # Does it contain duplicate column?
    if frame.columns.duplicated().any():
        raise DatasetValidationError("Historical prices dataset contains duplicate columns.")

    # Does it have an invalid date?
    if frame["DATE"].isna().any():
        raise DatasetValidationError("Historical prices dataset contains invalid dates.")

    price_columns = [column for column in frame.columns if column != "DATE"]
    # Is it missing the price columns?
    if not price_columns:
        raise DatasetValidationError("Historical prices dataset has no constituent price columns.")

    # Does it have empty symbol?
    if any(column == "" for column in price_columns):
        raise DatasetValidationError("Historical prices dataset contains blank constituent symbols.")

    # Are all the numeric valids?
    numeric_prices = frame[price_columns].apply(pd.to_numeric, errors="coerce")
    if numeric_prices.isna().any().any():
        raise DatasetValidationError("Historical prices dataset contains invalid numeric values.")

    frame = pd.concat([frame[["DATE"]], numeric_prices], axis=1)
    return frame.sort_values("DATE").reset_index(drop=True)
