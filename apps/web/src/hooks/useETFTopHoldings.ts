import { useCallback, useEffect, useMemo, useState } from "react";

export type ETFTopHolding = {
  name: string;
  weight: number;
  latest_close: number;
  latest_holding_value: number;
};

type ETFTopHoldingsResponse = {
  etf_id: string;
  latest_date: string;
  limit: number;
  items: ETFTopHolding[];
};

type UseETFTopHoldingsResult = {
  latestDate: string;
  isLoadingTopHoldings: boolean;
  topHoldings: ETFTopHolding[];
  topHoldingsErrorMessage: string;
  refreshTopHoldings: () => Promise<void>;
};

/**
 * Load the highest-value ETF holdings for one selected ETF.
 */
export function useETFTopHoldings(
  etfId: string,
  asOfDate?: string
): UseETFTopHoldingsResult {
  const [latestDate, setLatestDate] = useState("");
  const [isLoadingTopHoldings, setIsLoadingTopHoldings] = useState(false);
  const [topHoldings, setTopHoldings] = useState<ETFTopHolding[]>([]);
  const [topHoldingsErrorMessage, setTopHoldingsErrorMessage] = useState("");

  const refreshTopHoldings = useCallback(async (signal?: AbortSignal) => {
    if (!etfId) {
      setLatestDate("");
      setIsLoadingTopHoldings(false);
      setTopHoldings([]);
      setTopHoldingsErrorMessage("");
      return;
    }

    setIsLoadingTopHoldings(true);
    setTopHoldingsErrorMessage("");

    try {
      const endpoint = new URL(`/etfs/${etfId}/top-holdings`, window.location.origin);
      endpoint.searchParams.set("limit", "5");
      if (asOfDate) {
        endpoint.searchParams.set("as_of", asOfDate);
      }

      const response = await fetch(`${endpoint.pathname}${endpoint.search}`, { signal });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
      }

      const data = (await response.json()) as ETFTopHoldingsResponse;
      setLatestDate(data.latest_date);
      setTopHoldings(data.items);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "ETF top holdings could not be loaded.";
      setTopHoldingsErrorMessage(message);
      setLatestDate("");
      setTopHoldings([]);
    } finally {
      if (!signal?.aborted) {
        setIsLoadingTopHoldings(false);
      }
    }
  }, [asOfDate, etfId]);

  useEffect(() => {
    const abortController = new AbortController();
    void refreshTopHoldings(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [refreshTopHoldings]);

  return useMemo(
    () => ({
      latestDate,
      isLoadingTopHoldings,
      topHoldings,
      topHoldingsErrorMessage,
      refreshTopHoldings,
    }),
    [
      latestDate,
      isLoadingTopHoldings,
      topHoldings,
      topHoldingsErrorMessage,
      refreshTopHoldings,
    ]
  );
}
