import { useCallback, useEffect, useMemo, useState } from "react";

export type ETFPriceSeriesPoint = {
  date: string;
  price: number;
};

export type ETFPriceTrendDirection = "up" | "down" | "flat";

export type ETFPriceTrend = {
  direction: ETFPriceTrendDirection;
  changeRatio: number;
  startPrice: number;
  endPrice: number;
  hasTrendData: boolean;
};

type ETFPriceSeriesResponse = {
  etf_id: string;
  latest_date: string;
  items: ETFPriceSeriesPoint[];
};

type UseETFPriceSeriesResult = {
  latestDate: string;
  isLoadingPriceSeries: boolean;
  priceSeries: ETFPriceSeriesPoint[];
  priceSeriesErrorMessage: string;
  computePriceTrend: (startIndex: number, endIndex: number) => ETFPriceTrend;
  refreshPriceSeries: () => Promise<void>;
};

function emptyTrend(): ETFPriceTrend {
  return {
    direction: "flat",
    changeRatio: 0,
    startPrice: 0,
    endPrice: 0,
    hasTrendData: false,
  };
}

/**
 * Compute directional price change for a selected index range.
 */
export function computePriceTrendForRange(
  priceSeries: ETFPriceSeriesPoint[],
  startIndex: number,
  endIndex: number
): ETFPriceTrend {
  if (priceSeries.length === 0) {
    return emptyTrend();
  }

  const boundedStartIndex = Math.min(Math.max(startIndex, 0), priceSeries.length - 1);
  const boundedEndIndex = Math.min(Math.max(endIndex, 0), priceSeries.length - 1);
  const startPoint = priceSeries[Math.min(boundedStartIndex, boundedEndIndex)];
  const endPoint = priceSeries[Math.max(boundedStartIndex, boundedEndIndex)];
  if (!startPoint || !endPoint) {
    return emptyTrend();
  }

  const startPrice = startPoint.price;
  const endPrice = endPoint.price;
  const delta = endPrice - startPrice;
  const hasValidBasePrice = Number.isFinite(startPrice) && startPrice !== 0;
  const changeRatio = hasValidBasePrice ? delta / startPrice : 0;

  return {
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    changeRatio,
    startPrice,
    endPrice,
    hasTrendData: Number.isFinite(startPrice) && Number.isFinite(endPrice),
  };
}

/**
 * Load the reconstructed ETF price time series for one selected ETF.
 */
export function useETFPriceSeries(etfId: string): UseETFPriceSeriesResult {
  const [priceSeries, setPriceSeries] = useState<ETFPriceSeriesPoint[]>([]);
  const [latestDate, setLatestDate] = useState("");
  const [isLoadingPriceSeries, setIsLoadingPriceSeries] = useState(false);
  const [priceSeriesErrorMessage, setPriceSeriesErrorMessage] = useState("");

  const refreshPriceSeries = useCallback(async (signal?: AbortSignal) => {
    // No ETF selected
    if (!etfId) {
      setPriceSeries([]);
      setLatestDate("");
      setPriceSeriesErrorMessage("");
      setIsLoadingPriceSeries(false);
      return;
    }

    // Loading ETF.
    // If there is no custom upload and we're strictly using localhost (or even LAN), it's in theory fine.
    // However, for the sake of good frontend practice, I'll put the loading state here anyway.
    setIsLoadingPriceSeries(true);
    setPriceSeriesErrorMessage("");
    setPriceSeries([]);
    setLatestDate("");

    try {
      const response = await fetch(`/etfs/${etfId}/price-series`, { signal });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
      }

      const data = (await response.json()) as ETFPriceSeriesResponse;
      setPriceSeries(data.items);
      setLatestDate(data.latest_date);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "ETF reconstructed prices could not be loaded.";

      setPriceSeriesErrorMessage(message);
      setPriceSeries([]);
      setLatestDate("");
    } finally {
      if (!signal?.aborted) {
        setIsLoadingPriceSeries(false);
      }
    }
  }, [etfId]);

  // Use AbortController to prevent stale reads.
  useEffect(() => {
    const abortController = new AbortController();
    void refreshPriceSeries(abortController.signal);

    // If there is a change in refreshPriceSeries, abort the current hook call.
    return () => {
      abortController.abort();
    };
  }, [refreshPriceSeries]);

  const computePriceTrend = useCallback(
    (startIndex: number, endIndex: number) =>
      computePriceTrendForRange(priceSeries, startIndex, endIndex),
    [priceSeries]
  );

  // In theory we should add virtualization to optimize compute and I/O.
  // For this project scope, letting memoization recompute on state changes is acceptable.
  return useMemo(
    () => ({
      latestDate,
      isLoadingPriceSeries,
      priceSeries,
      priceSeriesErrorMessage,
      computePriceTrend,
      refreshPriceSeries,
    }),
    [
      latestDate,
      isLoadingPriceSeries,
      priceSeries,
      priceSeriesErrorMessage,
      computePriceTrend,
      refreshPriceSeries,
    ]
  );
}
