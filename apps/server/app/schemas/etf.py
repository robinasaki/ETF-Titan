from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class EtfCatalogItem(BaseModel):
    """
    A single ETF entry. It holds the ETF id and how many constituents it contains.

    Fields:
    - id: ETF symbol / id like "ETF1"
    - constituent_count: non-negative number of holding in that ETF
    """
    model_config = ConfigDict(extra="forbid") # Reject unexpected fields

    id: str
    constituent_count: int = Field(ge=0) # >= 0


class EtfCatalogResponse(BaseModel):
    """
    The response wrapper for the "list supported ETFs" endpoint.
    It's a container for multiple EtfCatalogItem.

    Fields:
    - items: List of EtfCatalogItem
    """
    model_config = ConfigDict(extra="forbid")

    items: list[EtfCatalogItem]


class HoldingSnapshotItem(BaseModel):
    """
    One row in a holding snapshot.
    It describes a single constituent in an ETF and its latest calculated values.

    Fields:
    - name: Constituent symbol like "AAPL"
    - weight: Portfolio weight in the ETF
    - latest_close: Latest available closing price for that constituent
    - Latest_holding_value: Weighted value
    """
    model_config = ConfigDict(extra="forbid")

    name: str
    weight: float = Field(ge=0)
    latest_close: float = Field(ge=0)
    latest_holding_value: float = Field(ge=0)


class HoldingsResponse(BaseModel):
    """
    The full response for an ETF holdings snapshot.
    It describes one ETF on the latest date and includes all of its holdings.

    Fields:
    - etf_id: ETF symbol
    - latest_date: Most recent date used for the snapshot
    - item: List of HoldingSnapshotItem
    """
    model_config = ConfigDict(extra="forbid")

    etf_id: str
    latest_date: str
    items: list[HoldingSnapshotItem]


class PriceSeriesPoint(BaseModel):
    """
    One data point in a reconstructred ETF price series.

    Fields:
    - date: Date string like "2003-02-23"
    - price: Reconstructed ETF price / value for that date
    """
    model_config = ConfigDict(extra="forbid")

    date: str
    price: float = Field(ge=0)


class PriceSeriesResponse(BaseModel):
    """
    The full historical reconstructred price-series response for one ETF.

    Fields:
    - etf_id: ETF id
    - latest_date: Latest available date in the dataset
    - item: List of PriceSeriesPoint
    """
    model_config = ConfigDict(extra="forbid")

    etf_id: str
    latest_date: str
    items: list[PriceSeriesPoint]


class TopHoldingsResponse(BaseModel):
    """
    The response for the "Top holdings" view.
    It gives the highest-value holding for an ETF.

    Fields:
    - etf_id: ETF id
    - latest_date: Date used for ranking
    - limit: How many top holdings requested
    - item: List of top HoldingSnapshotItem
    """
    model_config = ConfigDict(extra="forbid")

    etf_id: str
    latest_date: str
    limit: int = Field(ge=1)
    items: list[HoldingSnapshotItem]


class UploadedEtfAnalyticsResponse(BaseModel):
    """
    Per-ETF analytics for one uploaded ETF weights CSV.

    Fields:
    - etf_id: ETF id inferred from the uploaded file name
    - file_name: Uploaded ETF file name
    - latest_date: Most recent date used for the snapshot
    - holdings: Full holdings snapshot
    - price_series: Reconstructed ETF history
    - top_holdings: Top holdings for this ETF
    """
    model_config = ConfigDict(extra="forbid")

    etf_id: str
    file_name: str
    latest_date: str
    holdings: list[HoldingSnapshotItem]
    price_series: list[PriceSeriesPoint]
    top_holdings: list[HoldingSnapshotItem]


class UploadedAnalyticsBundleResponse(BaseModel):
    """
    The combined response returned after analyzing an uploaded ETF bundle.
    The bundle must contain `ETF1.csv`, `ETF2.csv`, and `prices.csv`.

    Fields:
    - source: Always `upload` for this endpoint
    - prices_file_name: Uploaded prices CSV file name
    - top_holdings_limit: Requested top holdings limit
    - items: Per-ETF uploaded analytics for both ETF files
    """
    model_config = ConfigDict(extra="forbid")

    source: Literal["upload"]
    prices_file_name: str
    top_holdings_limit: int = Field(ge=1)
    items: list[UploadedEtfAnalyticsResponse]
