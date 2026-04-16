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


def list_supported_etfs() -> EtfCatalogResponse:
    """
    Return the built-in ETF ids and each ETF's constituent count.
    """
    items = [
        EtfCatalogItem(id=etf_id, constituent_count=len(load_etf_weights_frame(etf_id)))
        for etf_id in get_supported_etf_ids()
    ]
    return EtfCatalogResponse(items=items)


def get_holdings_snapshot(etf_id: str) -> HoldingsResponse:
    """
    Return the latest holdings snapshot for one built-in ETF.

    Each item includes the constituent symbol, its configured weight, the latest
    closing price from the default prices dataset, and the latest weighted
    holding value.
    """
    normalized_etf_id, latest_date, holdings_frame, _ = _build_named_holdings_frame(
        etf_id
    )
    items = [
        HoldingSnapshotItem(
            name=row["name"],
            weight=_round_number(row["weight"]),
            latest_close=_round_number(row["latest_close"]),
            latest_holding_value=_round_number(row["latest_holding_value"]),
        )
        for row in holdings_frame.to_dict(orient="records")
    ]
    return HoldingsResponse(
        etf_id=normalized_etf_id, latest_date=latest_date, items=items
    )


def get_reconstructed_price_series(etf_id: str) -> PriceSeriesResponse:
    """
    Reconstruct the historical daily price series for one built-in ETF.

    The series is derived by applying the ETF's static constituent weights to
    the default constituent price history for each available date.
    """
    # Compute the ETF aggregate price timeseries.
    normalized_etf_id, latest_date, holdings_frame, prices_frame = (
        _build_named_holdings_frame(etf_id)
    )
    weights = holdings_frame.set_index("name")["weight"]
    reconstructed_prices = prices_frame[weights.index].mul(weights, axis=1).sum(axis=1)

    items = [
        PriceSeriesPoint(date=row.DATE.date().isoformat(), price=_round_number(price))
        for row, price in zip(
            prices_frame.itertuples(index=False), reconstructed_prices, strict=True
        )
    ]
    return PriceSeriesResponse(
        etf_id=normalized_etf_id, latest_date=latest_date, items=items
    )


def get_top_holdings(etf_id: str, limit: int = 5) -> TopHoldingsResponse:
    """
    Return the highest-value holdings for one built-in ETF.

    Holdings are ranked by latest holding value, with weight and symbol used as
    stable tie-breakers.
    """
    normalized_etf_id, latest_date, holdings_frame, _ = _build_named_holdings_frame(
        etf_id
    )

    # Sort top `limit`
    top_holdings = (
        holdings_frame.sort_values(
            by=["latest_holding_value", "weight", "name"],
            ascending=[False, False, True],
        )
        .head(limit)
        .reset_index(drop=True)
    )

    items = [
        HoldingSnapshotItem(
            name=row["name"],
            weight=_round_number(row["weight"]),
            latest_close=_round_number(row["latest_close"]),
            latest_holding_value=_round_number(row["latest_holding_value"]),
        )
        for row in top_holdings.to_dict(orient="records")
    ]
    return TopHoldingsResponse(
        etf_id=normalized_etf_id,
        latest_date=latest_date,
        limit=limit,
        items=items,
    )


def _build_named_holdings_frame(
    etf_id: str,
) -> tuple[str, str, pd.DataFrame, pd.DataFrame]:
    """
    Build validated holdings data for one built-in ETF.

    This helper normalizes the ETF id, loads the built-in ETF weights CSV and
    the built-in prices CSV, then aligns them into a holdings snapshot plus the
    filtered price history used by downstream calculations.
    """
    normalized_etf_id = etf_id.strip().upper()
    weights_frame = load_etf_weights_frame(
        normalized_etf_id
    )  # Loads the default ETF.csv
    prices_frame = load_prices_frame()  # Loads the default prices.csv
    latest_date, holdings_frame, aligned_prices_frame = _build_holdings_frame(
        weights_frame, prices_frame
    )
    return normalized_etf_id, latest_date, holdings_frame, aligned_prices_frame


def _build_uploaded_etf_analytics_item(
    etf_file_name: str,
    etf_staged_path: Path,
    prices_frame: pd.DataFrame,
    top_holdings_limit: int,
) -> UploadedEtfAnalyticsResponse:
    """
    Build the analytics payload for one uploaded ETF weights CSV.
    """
    weights_frame = load_uploaded_etf_weights_frame(etf_staged_path)
    latest_date, holdings_frame, aligned_prices_frame = _build_holdings_frame(
        weights_frame, prices_frame
    )

    # Builds and return the analytics
    return UploadedEtfAnalyticsResponse(
        etf_id=Path(etf_file_name).stem.upper(),
        file_name=Path(etf_file_name).name,
        latest_date=latest_date,
        holdings=_serialize_holding_items(holdings_frame),
        price_series=_serialize_price_series_items(
            holdings_frame, aligned_prices_frame
        ),
        top_holdings=_serialize_top_holding_items(holdings_frame, top_holdings_limit),
    )


def analyze_uploaded_etf(
    etf_file_name: str,
    etf_staged_path: Path,
    top_holdings_limit: int = 5,
) -> UploadedEtfAnalyticsResponse:
    """
    Analyze one uploaded ETF weights CSV against the bundled prices dataset.
    """
    prices_frame = load_prices_frame()
    item = _build_uploaded_etf_analytics_item(
        etf_file_name=etf_file_name,
        etf_staged_path=etf_staged_path,
        prices_frame=prices_frame,
        top_holdings_limit=top_holdings_limit,
    )
    persist_validated_upload(etf_staged_path, etf_file_name)
    return item


def _build_holdings_frame(
    weights_frame: pd.DataFrame, prices_frame: pd.DataFrame
) -> tuple[str, pd.DataFrame, pd.DataFrame]:
    """
    Align ETF weights with price history and compute derived holdings values.
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

    # Get latest stats on the symbol
    latest_row = prices_frame.iloc[-1]
    latest_date = latest_row["DATE"].date().isoformat()
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


def _serialize_holding_items(holdings_frame: pd.DataFrame) -> list[HoldingSnapshotItem]:
    """
    Converts a df into a list of HoldingSnapshotItem.

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


__all__ = [
    "DatasetValidationError",
    "UnknownEtfError",
    "analyze_uploaded_etf",
    "get_holdings_snapshot",
    "get_reconstructed_price_series",
    "get_top_holdings",
    "list_supported_etfs",
]
