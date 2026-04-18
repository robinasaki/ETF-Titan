import { useCallback, useEffect, useMemo, useState } from "react";
import { useToastState } from "./useToastState";

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

type UploadEtfResponse = {
  etf_id: string;
  file_name: string;
};

type UseETFHoldingsResult = {
  activeEtfId: string;
  etfs: ETFCatalogItem[];
  holdings: ETFHolding[];
  latestDate: string;
  uploadToastMessage: string;
  isLoadingCatalog: boolean;
  isLoadingHoldings: boolean;
  errorMessage: string;
  refreshHoldings: () => Promise<void>;
  uploadEtfCsv: (file: File) => Promise<void>;
  clearUploadToast: () => void;
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

async function readServerErrorDetail(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    if (payload.detail) {
      return payload.detail;
    }
  } catch {
    // Fall back to generic error detail below.
  }
  return `Request failed with status ${response.status}.`;
}

/**
 * Load uploaded ETFs and holdings data from backend endpoints.
 */
export function useETFHoldings(asOfDate?: string): UseETFHoldingsResult {
  const [etfs, setEtfs] = useState<ETFCatalogItem[]>([]);
  const [activeEtfId, setActiveEtfId] = useState("");
  const [holdings, setHoldings] = useState<ETFHolding[]>([]);
  const [latestDate, setLatestDate] = useState("");
  const {
    toastMessage: uploadToastMessage,
    showToast: showUploadToast,
    clearToast: clearUploadToast,
  } = useToastState();
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Gets the ETF ids and their symbol counts.
   */
  const loadCatalog = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingCatalog(true);
    setErrorMessage("");

    try {
      const data = await requestJson<ETFCatalogResponse>("/etfs", signal);
      setEtfs(data.items);
      setActiveEtfId((currentEtfId) => {
        if (currentEtfId && data.items.some((item) => item.id === currentEtfId)) {
          return currentEtfId;
        }
        return data.items[0]?.id || "";
      });
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "ETF catalog could not be loaded.";
      setErrorMessage(message);
    } finally {
      if (!signal?.aborted) {
        setIsLoadingCatalog(false);
      }
    }
  }, []);

  /**
   * Obtain the ETF catalog. Id and constituent counts.
   */
  useEffect(() => {
    const abortController = new AbortController();
    void loadCatalog(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [loadCatalog]);

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

    try {
      const holdingsEndpoint = new URL(
        `/etfs/${activeEtfId}/holdings`,
        window.location.origin
      );
      if (asOfDate) {
        holdingsEndpoint.searchParams.set("as_of", asOfDate);
      }

      const data = await requestJson<ETFHoldingsResponse>(
        `${holdingsEndpoint.pathname}${holdingsEndpoint.search}`
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
  }, [activeEtfId, asOfDate]);

  /**
   * Upload the csv.
   * On success, refresh the catalog and sets activeETFId.
   * On failure, read server detail and show toast.
   */
  const uploadEtfCsv = useCallback(async (file: File) => {
    const payload = new FormData(); // Create a multipart payload container
    payload.append("etf_file", file);

    try {
      const response = await fetch("/etfs/upload?limit=5", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const detail = await readServerErrorDetail(response);
        showUploadToast(detail);
        return;
      }

      const data = (await response.json()) as UploadEtfResponse;
      await loadCatalog();
      setActiveEtfId(data.etf_id);
      clearUploadToast();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ETF upload request failed.";
      showUploadToast(message);
    }
  }, [clearUploadToast, loadCatalog, showUploadToast]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      return;
    }

    const eventSource = new EventSource("/etfs/subscribe");
    const refreshCatalogOnUpload = () => {
      void loadCatalog();
    };

    eventSource.addEventListener("etf_uploaded", refreshCatalogOnUpload);
    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.removeEventListener("etf_uploaded", refreshCatalogOnUpload);
      eventSource.close();
    };
  }, [loadCatalog]);

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
      uploadToastMessage,
      isLoadingCatalog,
      isLoadingHoldings,
      errorMessage,
      refreshHoldings,
      uploadEtfCsv,
      clearUploadToast,
      setActiveEtfId,
    }),
    [
      activeEtfId,
      clearUploadToast,
      errorMessage,
      etfs,
      holdings,
      isLoadingCatalog,
      isLoadingHoldings,
      latestDate,
      refreshHoldings,
      uploadEtfCsv,
      uploadToastMessage,
    ]
  );
}
