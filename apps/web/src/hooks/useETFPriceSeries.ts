import { useCallback, useEffect, useMemo, useState } from "react";

export type ETFPriceSeriesPoint = {
  date: string;
  price: number;
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
  refreshPriceSeries: () => Promise<void>;
};

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

  // In theory we need to add some virtualization to optimize the comptue and IO.
  // But for the scope of this project, I'll let the memotization recompute upon one stat change.
  return useMemo(
    () => ({
      latestDate,
      isLoadingPriceSeries,
      priceSeries,
      priceSeriesErrorMessage,
      refreshPriceSeries,
    }),
    [
      latestDate,
      isLoadingPriceSeries,
      priceSeries,
      priceSeriesErrorMessage,
      refreshPriceSeries,
    ]
  );
}
