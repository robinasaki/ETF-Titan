from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from types import MappingProxyType
from uuid import uuid4

import pandas as pd
from pandas.errors import ParserError

"""
Construct the directory path.
"""
REPO_ROOT = Path(__file__).resolve().parents[4]
STORAGE_DIR = REPO_ROOT / "apps" / "server" / "storage"
DEFAULT_DATA_DIR = STORAGE_DIR / "default"
PRICES_FILE = DEFAULT_DATA_DIR / "prices.csv"
TEMP_UPLOADS_DIR = STORAGE_DIR / "tmp"
UPLOADS_DIR = REPO_ROOT / "apps" / "server" / "storage" / "uploads"

# Use MappingProxyType() to ensure the stream is read-only.
"""Server-side ETF data file allowed names."""
ETF_DATA_FILES = MappingProxyType(
    {
        "ETF1": DEFAULT_DATA_DIR / "ETF1.csv",
        "ETF2": DEFAULT_DATA_DIR / "ETF2.csv",
    }
)


class UnknownEtfError(ValueError):
    """Raised when an ETF id is not part of the supported sample datasets."""


class DatasetValidationError(ValueError):
    """Raised when one of the bundled CSV files is malformed."""


def get_supported_etf_ids() -> tuple[str, ...]:
    """Return the built-in default ETF csv ids. For example, `ETF1`, `ETF2`, etc."""
    return tuple(ETF_DATA_FILES.keys())


def _require_existing_file(path: Path) -> None:
    """Given a full server path, checks if the required dataset is there.
    This is a guard, not a query. Thus it's a None/Error return, not a bool return.

    Usage:
    ```python
    _require_existing_file(Path("apps/server/storage/default/prices.csv"))
    ```
    """
    if not path.is_file():
        raise DatasetValidationError("A required ETF dataset is missing.")


@lru_cache
def load_prices_frame() -> pd.DataFrame:
    """Load the default prices.csv into a pd.DataFrame."""
    _require_existing_file(PRICES_FILE)

    try:
        frame = pd.read_csv(PRICES_FILE, parse_dates=["DATE"])
    except (ParserError, ValueError) as exc:
        raise DatasetValidationError("Historical prices dataset could not be parsed.") from exc
    return _normalize_prices_frame(frame)


@lru_cache
def load_etf_weights_frame(etf_id: str) -> pd.DataFrame:
    """Load the default ETF csvs into a pd.DataFrame."""
    normalized_etf_id = etf_id.strip().upper()
    path = ETF_DATA_FILES.get(normalized_etf_id)
    if path is None:
        raise UnknownEtfError("ETF id is not supported.")

    _require_existing_file(path)

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


def load_uploaded_prices_frame(path: Path) -> pd.DataFrame:
    """Load a staged uploaded prices CSV from disk."""
    _require_existing_file(path)

    try:
        frame = pd.read_csv(path, parse_dates=["DATE"], encoding="utf-8-sig")
    except (ParserError, ValueError, UnicodeDecodeError) as exc:
        raise DatasetValidationError("Uploaded prices CSV could not be parsed.") from exc
    return _normalize_prices_frame(frame)


def persist_validated_upload(staged_path: Path, filename: str) -> Path:
    """Promote a validated staged upload into permanent server-side storage."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    stored_file_path = UPLOADS_DIR / Path(filename).name
    staged_path.replace(stored_file_path)
    return stored_file_path


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
