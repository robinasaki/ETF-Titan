from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.repositories.csv_repository import (
    DatasetValidationError,
    UnknownEtfError,
    get_supported_etf_ids,
    load_etf_weights_frame,
    load_prices_frame,
    load_uploaded_etf_weights_frame,
    persist_validated_upload,
)
from app.schemas.etf import (
    EtfCatalogItem,
    EtfCatalogResponse,
    HoldingsResponse,
    HoldingSnapshotItem,
    PriceSeriesPoint,
    PriceSeriesResponse,
    TopHoldingsResponse,
    UploadedEtfAnalyticsResponse,
)


"""Allowed margin of error when ETF weights are checked against 1.0."""
WEIGHT_SUM_TOLERANCE = 0.01


class InvalidAsOfDateError(ValueError):
    """Raised when an as-of date is invalid or unavailable."""


def _build_named_holdings_frame(
    etf_id: str,
    as_of: str | None = None,
) -> tuple[str, str, pd.DataFrame, pd.DataFrame]:
    """
    Helper function. Build the core analytics frames given an `etf_id`.

    Returns:
    - normalized_etf_id
    - latest_date: Snapshot date used for metrics
    - holdings_frame: Per-symbol snapshot df with the derived fields (`name`, `weight`, `latest_close`, `latest_holding_value`)
    - aligned_prices_frame: Time series price df
    """
    normalized_etf_id = etf_id.strip().upper()
    weights_frame = load_etf_weights_frame(normalized_etf_id)
    prices_frame = load_prices_frame()
    latest_date, holdings_frame, prices_frame = _build_holdings_frame(
        weights_frame,
        prices_frame,
        as_of=as_of,
    )
    return normalized_etf_id, latest_date, holdings_frame, prices_frame


def _build_uploaded_etf_analytics_response(
    persisted_file_name: str,
    latest_date: str,
    holdings_frame: pd.DataFrame,
    prices_frame: pd.DataFrame,
    top_holdings_limit: int,
) -> UploadedEtfAnalyticsResponse:
    """
    Helper function. Serialize uploaded ETF analytics.
    """
    return UploadedEtfAnalyticsResponse(
        etf_id=Path(persisted_file_name).stem.upper(),
        file_name=Path(persisted_file_name).name,
        latest_date=latest_date,
        holdings=_serialize_holding_items(holdings_frame),
        price_series=_serialize_price_series_items(holdings_frame, prices_frame),
        top_holdings=_serialize_top_holding_items(holdings_frame, top_holdings_limit),
    )


def _build_holdings_frame(
    weights_frame: pd.DataFrame,
    prices_frame: pd.DataFrame,
    as_of: str | None = None,
) -> tuple[str, pd.DataFrame, pd.DataFrame]:
    """
    Helper function. Validate and merge the `prices_frame` with `weights_frame`.
    """
    holdings_frame = weights_frame.copy()

    # All symbols with their prices
    price_symbols = {column for column in prices_frame.columns if column != "DATE"}

    # Checks if there are any missing symbols in prices.csv
    missing_symbols = sorted(set(holdings_frame["name"]) - price_symbols)
    if missing_symbols:
        raise DatasetValidationError(
            "ETF weights reference constituents missing from prices data."
        )

    # Does the ETF weights sum up to 1.0?
    total_weight = float(holdings_frame["weight"].sum())
    if abs(total_weight - 1.0) > WEIGHT_SUM_TOLERANCE:
        raise DatasetValidationError("ETF weights must sum to approximately 1.0.")

    # Resolve the snapshot row for latest or selected as-of date.
    latest_row, latest_date = _resolve_snapshot_row(prices_frame, as_of)
    latest_prices = latest_row.drop(labels=["DATE"]).to_dict()

    # Compute the latest close price
    holdings_frame["latest_close"] = holdings_frame["name"].map(latest_prices)
    if holdings_frame["latest_close"].isna().any():
        raise DatasetValidationError(
            "ETF weights could not be aligned to the latest close prices."
        )

    # Compute the latest aggregated ETF value
    holdings_frame["latest_holding_value"] = (
        holdings_frame["weight"] * holdings_frame["latest_close"]
    )

    return latest_date, holdings_frame, prices_frame


def _resolve_snapshot_row(
    prices_frame: pd.DataFrame,
    as_of: str | None,
) -> tuple[pd.Series, str]:
    """
    Helper function. Select the snapshot row given `as_of`.
    """
    if as_of is None:
        latest_row = prices_frame.iloc[-1]
        return latest_row, latest_row["DATE"].date().isoformat()

    normalized_as_of = _normalize_as_of_date(as_of)
    matching_rows = prices_frame.loc[
        prices_frame["DATE"].dt.date == normalized_as_of.date()
    ]
    if matching_rows.empty:
        raise InvalidAsOfDateError(
            f"as_of date '{normalized_as_of.date().isoformat()}' is unavailable."
        )
    selected_row = matching_rows.iloc[-1]
    return selected_row, selected_row["DATE"].date().isoformat()


def _normalize_as_of_date(as_of: str) -> pd.Timestamp:
    """
    Helper function. Parse and normalize as-of date input.
    """
    normalized_as_of = as_of.strip()
    if not normalized_as_of:
        raise InvalidAsOfDateError("as_of date must be a non-empty YYYY-MM-DD string.")

    try:
        parsed_as_of = pd.to_datetime(
            normalized_as_of, format="%Y-%m-%d", errors="raise"
        )
    except (ValueError, TypeError) as exc:
        raise InvalidAsOfDateError("as_of date must use YYYY-MM-DD format.") from exc

    return parsed_as_of


def _serialize_holding_items(holdings_frame: pd.DataFrame) -> list[HoldingSnapshotItem]:
    """
    Helper function. Converts a df into a list of HoldingSnapshotItem.

    Response:
    ```
    [
        {
            "name": "AAPL",
            "weight": 0.15,
            "latest_close": 192.33,
            "latest_holding_value": 28.8495,
        }
    ]
    ```
    """
    return [
        HoldingSnapshotItem(
            name=row["name"],
            weight=_round_number(row["weight"]),
            latest_close=_round_number(row["latest_close"]),
            latest_holding_value=_round_number(row["latest_holding_value"]),
        )
        for row in holdings_frame.to_dict(orient="records")
    ]


def _serialize_price_series_items(
    holdings_frame: pd.DataFrame,
    prices_frame: pd.DataFrame,
) -> list[PriceSeriesPoint]:
    """
    Reconstruct the ETF price history and formats it to API response obj.
    """
    weights = holdings_frame.set_index("name")["weight"]
    reconstructed_prices = prices_frame[weights.index].mul(weights, axis=1).sum(axis=1)

    return [
        PriceSeriesPoint(date=row.DATE.date().isoformat(), price=_round_number(price))
        for row, price in zip(
            prices_frame.itertuples(index=False), reconstructed_prices, strict=True
        )
    ]


def _serialize_top_holding_items(
    holdings_frame: pd.DataFrame,
    limit: int,
) -> list[HoldingSnapshotItem]:
    """
    Picks the top x holdings, convert them into API response obj.
    """
    top_holdings = (
        holdings_frame.sort_values(
            by=["latest_holding_value", "weight", "name"],
            ascending=[False, False, True],
        )
        .head(limit)
        .reset_index(drop=True)
    )

    return [
        HoldingSnapshotItem(
            name=row["name"],
            weight=_round_number(row["weight"]),
            latest_close=_round_number(row["latest_close"]),
            latest_holding_value=_round_number(row["latest_holding_value"]),
        )
        for row in top_holdings.to_dict(orient="records")
    ]


def _round_number(value: float, digits: int = 6) -> float:
    """
    Helper function for rounding.
    """
    return round(float(value), digits)


def list_supported_etfs() -> EtfCatalogResponse:
    """
    Return uploaded ETF ids and each ETF's constituent count.
    """
    items = [
        EtfCatalogItem(id=etf_id, constituent_count=len(load_etf_weights_frame(etf_id)))
        for etf_id in get_supported_etf_ids()
    ]
    return EtfCatalogResponse(items=items)


def analyze_uploaded_etf(
    etf_staged_path: Path,
    top_holdings_limit: int = 5,
) -> UploadedEtfAnalyticsResponse:
    """
    Given `etf_staged_path`, merge with prices frame, and return the serialized response.

    Reposne fields:
    - `persisted_file_name`: The stored file name
    - `latest_date`: The latest date on file
    - `holdings_frame`:
        ```
        pd.DataFrame(
        [
            {
                "name": "AAPL",
                "weight": 0.60,
                "latest_close": 110.0,
                "latest_holding_value": 66.0,
            },
            {
                "name": "MSFT",
                "weight": 0.40,
                "latest_close": 210.0,
                "latest_holding_value": 84.0,
            },
        ]
        )
        ```
    - `prices_frame`:
        ```
        pd.DataFrame(
        [
            {"DATE": pd.Timestamp("2024-01-01"), "AAPL": 100.0, "MSFT": 200.0},
            {"DATE": pd.Timestamp("2024-01-02"), "AAPL": 110.0, "MSFT": 210.0},
        ]
        )
        ```
    - `top_holdings_limit`: Top x holdings? (Default to 5, but added here for scalability)
    """
    # Load prices frame,
    prices_frame = load_prices_frame()

    # Load weights frame,
    staged_weights_frame = load_uploaded_etf_weights_frame(etf_staged_path)

    # See if they can be merged,
    latest_date, holdings_frame, prices_frame = _build_holdings_frame(
        staged_weights_frame,
        prices_frame,
    )

    # If no exception so far,
    stored_path = persist_validated_upload(etf_staged_path)

    # Then serialize this.
    return _build_uploaded_etf_analytics_response(
        persisted_file_name=stored_path.name,
        latest_date=latest_date,
        holdings_frame=holdings_frame,
        prices_frame=prices_frame,
        top_holdings_limit=top_holdings_limit,
    )


def get_holdings_snapshot(etf_id: str, as_of: str | None = None) -> HoldingsResponse:
    """
    Return the latest holding given `etf_id` and `as_of` date.

    Each item includes the constituent symbol, its configured weight, the latest
    closing price from the default prices dataset, and the latest weighted
    holding value.
    """
    normalized_etf_id, latest_date, holdings_frame, _ = _build_named_holdings_frame(
        etf_id,
        as_of=as_of,
    )
    
    return HoldingsResponse(
        etf_id=normalized_etf_id,
        latest_date=latest_date,
        items=_serialize_holding_items(holdings_frame),
    )


def get_reconstructed_price_series(etf_id: str) -> PriceSeriesResponse:
    """
    Return the time series price data given an `etf_id`.

    The series is derived by applying the ETF's static constituent weights to
    the default constituent price history for each available date.
    """
    normalized_etf_id, latest_date, holdings_frame, prices_frame = (
        _build_named_holdings_frame(etf_id)
    )
    return PriceSeriesResponse(
        etf_id=normalized_etf_id,
        latest_date=latest_date,
        items=_serialize_price_series_items(holdings_frame, prices_frame),
    )


def get_top_holdings(
    etf_id: str,
    limit: int = 5,
    as_of: str | None = None,
) -> TopHoldingsResponse:
    """
    Return the highest-value holdings for one uploaded ETF.

    Holdings are ranked by latest holding value, with weight and symbol used as
    stable tie-breakers.
    """
    normalized_etf_id, latest_date, holdings_frame, _ = _build_named_holdings_frame(
        etf_id,
        as_of=as_of,
    )

    return TopHoldingsResponse(
        etf_id=normalized_etf_id,
        latest_date=latest_date,
        limit=limit,
        items=_serialize_top_holding_items(holdings_frame, limit),
    )


__all__ = [
    "DatasetValidationError",
    "InvalidAsOfDateError",
    "UnknownEtfError",
    "analyze_uploaded_etf",
    "get_holdings_snapshot",
    "get_reconstructed_price_series",
    "get_top_holdings",
    "list_supported_etfs",
]
