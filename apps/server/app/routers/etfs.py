from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from app.repositories.csv_repository import cleanup_staged_upload, create_staged_upload_path

from app.schemas.etf import (
    EtfCatalogResponse,
    HoldingsResponse,
    PriceSeriesResponse,
    TopHoldingsResponse,
    UploadedEtfAnalyticsResponse,
)
from app.services.etf_service import (
    DatasetValidationError,
    InvalidAsOfDateError,
    UnknownEtfError,
    analyze_uploaded_etf,
    get_holdings_snapshot,
    get_reconstructed_price_series,
    get_top_holdings,
    list_supported_etfs,
)


router = APIRouter(prefix="/etfs", tags=["etfs"])

ResponseT = TypeVar("ResponseT") # For python type checker

# For browser compatibility. Some browsers submit different CSV content types.
CSV_CONTENT_TYPES = {
    "text/csv",
    "application/csv",
}
ETF_UPLOAD_FILENAME_REGEX = r"^ETF\d*\.csv$"
UPLOAD_READ_CHUNK_BYTES = 64 * 1024
MAX_UPLOAD_CSV_BYTES = 400


@router.get("", response_model=EtfCatalogResponse)
def list_etfs() -> EtfCatalogResponse:
    """
    Return the built-in ETF catalog.

    Response:
    ```
    EtfCatalogResponse(
        items=[
            EtfCatalogItem(id="ETF1", constituent_count=10),
            EtfCatalogItem(id="ETF2", constituent_count=25),
        ]
    )
    ```
    """
    return _handle_service_call(list_supported_etfs)


@router.get("/{etf_id}/holdings", response_model=HoldingsResponse)
def read_etf_holdings(
    etf_id: str,
    as_of: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> HoldingsResponse:
    """
    Return the latest holdings snapshot for one built-in ETF.

    Response:
    ```
    HoldingsResponse(
        etf_id="ETF1",
        latest_date="2024-01-31",
        items=[
            HoldingSnapshotItem(
                name="AAPL",
                weight=0.15,
                latest_close=192.33,
                latest_holding_value=28.8495,
            ),
            ...
        ],
    )
    ```
    """
    return _handle_service_call(lambda: get_holdings_snapshot(etf_id, as_of=as_of))


@router.get("/{etf_id}/price-series", response_model=PriceSeriesResponse)
def read_etf_price_series(etf_id: str) -> PriceSeriesResponse:
    """
    Return the reconstructed price series for one built-in ETF.

    Response:
    ```
    PriceSeriesResponse(
        etf_id="ETF1",
        latest_date="2024-01-31",
        items=[
            PriceSeriesPoint(date="2024-01-01", price=101.23),
            PriceSeriesPoint(date="2024-01-02", price=101.87),
        ],
    )
    ```
    """
    return _handle_service_call(lambda: get_reconstructed_price_series(etf_id))


@router.get("/{etf_id}/top-holdings", response_model=TopHoldingsResponse)
def read_etf_top_holdings(
    etf_id: str,
    limit: int = Query(default=5, ge=1, le=10),
    as_of: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> TopHoldingsResponse:
    """
    Return the highest-value holdings for one built-in ETF.

    Response:
    ```
    TopHoldingsResponse(
        etf_id="ETF1",
        latest_date="2024-01-31",
        limit=5,
        items=[
            HoldingSnapshotItem(
                name="AAPL",
                weight=0.15,
                latest_close=192.33,
                latest_holding_value=28.8495,
            ),
            ...
        ],
    )
    ```
    """
    return _handle_service_call(lambda: get_top_holdings(etf_id, limit, as_of=as_of))


@router.post("/upload", response_model=UploadedEtfAnalyticsResponse)
async def upload_etf_analytics(
    etf_file: UploadFile = File(...),
    limit: int = Query(default=5, ge=1, le=10),
) -> UploadedEtfAnalyticsResponse:
    """
    Analyze one uploaded ETF weights file against the bundled prices file.

    Response:
    ```
    UploadedEtfAnalyticsResponse(
        etf_id="ETF1",
        file_name="ETF1.csv",
        latest_date="2024-01-31",
        holdings=[...],
        price_series=[...],
        top_holdings=[...],
    )
    ```
    """
    etf_staged_path = await _stage_csv_upload(
        upload=etf_file,
        label="ETF weights",
    )
    try:
        analytics = _handle_upload_call(
            lambda: analyze_uploaded_etf(
                etf_staged_path=etf_staged_path,
                top_holdings_limit=limit,
            )
        )

        return analytics
    finally:
        cleanup_staged_upload(etf_staged_path)


def _handle_service_call(operation: Callable[[], ResponseT]) -> ResponseT:
    """Run a built-in ETF service call and map domain errors to HTTP errors."""
    try:
        return operation()
    except UnknownEtfError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ETF id is not supported.",
        ) from exc
    except DatasetValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ETF dataset failed validation.",
        ) from exc
    except InvalidAsOfDateError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc


def _handle_upload_call(operation: Callable[[], ResponseT]) -> ResponseT:
    """Run an upload service call and map validation errors to HTTP errors."""
    try:
        return operation()
    except DatasetValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc


async def _stage_csv_upload(
    upload: UploadFile,
    label: str,
) -> Path:
    """Validate and stage one uploaded CSV file before analysis."""
    filename = Path(upload.filename or "").name
    if not filename.lower().endswith(".csv"):
        await upload.close()
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"{label} upload must be a .csv file.",
        )
    if upload.content_type and upload.content_type not in CSV_CONTENT_TYPES:
        await upload.close()
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"{label} upload must use a CSV content type.",
        )

    staged_path = create_staged_upload_path(filename)
    wrote_any = False
    bytes_written = 0
    try:
        with staged_path.open("wb") as staged_file:
            while True:
                chunk = await upload.read(UPLOAD_READ_CHUNK_BYTES)
                if not chunk:
                    break
                wrote_any = True
                bytes_written += len(chunk)
                if bytes_written > MAX_UPLOAD_CSV_BYTES:
                    cleanup_staged_upload(staged_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail=(
                            f"{label} upload exceeds the maximum size of "
                            f"{MAX_UPLOAD_CSV_BYTES} bytes."
                        ),
                    )
                staged_file.write(chunk)
    except OSError as exc:
        cleanup_staged_upload(staged_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{label} upload could not be staged on the server.",
        ) from exc
    finally:
        await upload.close()

    if not wrote_any:
        cleanup_staged_upload(staged_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{label} upload is empty.",
        )

    return staged_path
