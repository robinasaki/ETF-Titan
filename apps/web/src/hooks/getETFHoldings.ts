import { useCallback, useEffect, useMemo, useState } from "react";

export type ETFCatalogItem = {
  id: string;
  constituent_count: number;
};

export type ETFHolding = {
  name: string;
  weight: number;
  latest_close: number;
  latest_holding_value: number;
};

type ETFCatalogResponse = {
  items: ETFCatalogItem[];
};

type ETFHoldingsResponse = {
  etf_id: string;
  latest_date: string;
  items: ETFHolding[];
};

type UseETFHoldingsResult = {
  activeEtfId: string;
  etfs: ETFCatalogItem[];
  holdings: ETFHolding[];
  latestDate: string;
  isLoadingCatalog: boolean;
  isLoadingHoldings: boolean;
  errorMessage: string;
  refreshHoldings: () => Promise<void>;
  setActiveEtfId: (etfId: string) => void;
};

/**
 * Helpfer function to call endpoint.
 */
async function requestJson<ResponseType>(
  endpoint: string,
  signal?: AbortSignal
): Promise<ResponseType> {
  const response = await fetch(endpoint, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return (await response.json()) as ResponseType;
}

/**
 * Get all default pre-loaded ETFs.
 */
export function useETFHoldings(): UseETFHoldingsResult {
  const [etfs, setEtfs] = useState<ETFCatalogItem[]>([]);
  const [activeEtfId, setActiveEtfId] = useState("");
  const [holdings, setHoldings] = useState<ETFHolding[]>([]);
  const [latestDate, setLatestDate] = useState("");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Obtain the ETF catalog. Id and constituent counts.
   */
  useEffect(() => {
    const abortController = new AbortController();

    const loadCatalog = async () => {
      setIsLoadingCatalog(true);
      setErrorMessage("");

      try {
        const data = await requestJson<ETFCatalogResponse>(
          "/etfs",
          abortController.signal
        );

        setEtfs(data.items);
        setActiveEtfId((currentEtfId) => currentEtfId || data.items[0]?.id || "");
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "ETF catalog could not be loaded.";

        setErrorMessage(message);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingCatalog(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      abortController.abort();
    };
  }, []);

  /**
   * Load selected ETF holdings.
   */
  const refreshHoldings = useCallback(async () => {
    if (!activeEtfId) {
      setHoldings([]);
      setLatestDate("");
      return;
    }

    setIsLoadingHoldings(true);
    setErrorMessage("");
    setHoldings([]);
    setLatestDate("");

    try {
      const data = await requestJson<ETFHoldingsResponse>(
        `/etfs/${activeEtfId}/holdings`
      );

      setHoldings(data.items);
      setLatestDate(data.latest_date);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "ETF holdings could not be loaded.";

      setErrorMessage(message);
    } finally {
      setIsLoadingHoldings(false);
    }
  }, [activeEtfId]);

  useEffect(() => {
    void refreshHoldings();
  }, [refreshHoldings]);

  /**
   * Maybe we could use some virtualization / pagnition here.
   * Recompute the entire table memotization if one stat changes is not ideal on a large df.
   * But since the dfs here are small it's fine.
   */
  return useMemo(
    () => ({
      activeEtfId,
      etfs,
      holdings,
      latestDate,
      isLoadingCatalog,
      isLoadingHoldings,
      errorMessage,
      refreshHoldings,
      setActiveEtfId,
    }),
    [
      activeEtfId,
      errorMessage,
      etfs,
      holdings,
      isLoadingCatalog,
      isLoadingHoldings,
      latestDate,
      refreshHoldings,
    ]
  );
}
