import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useETFHoldings } from "./getETFHoldings";

/**
 * Create a minimal fetch Response-like object for hook tests.
 */
function mockJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("useETFHoldings", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    // Reinstall a clean fetch mock for each scenario.
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    // Restore browser globals to avoid cross-test leaks.
    vi.unstubAllGlobals();
  });

  it("loads ETF catalog and holdings for the first ETF", async () => {
    // Arrange: catalog succeeds and first ETF holdings are returned.
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          items: [
            { id: "ETF1", constituent_count: 2 },
            { id: "ETF2", constituent_count: 1 },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          etf_id: "ETF1",
          latest_date: "2026-04-15",
          items: [
            {
              name: "AAPL",
              weight: 12.5,
              latest_close: 189.44,
              latest_holding_value: 23.68,
            },
          ],
        })
      );

    const { result } = renderHook(() => useETFHoldings());

    // Catalog lifecycle finishes first.
    await waitFor(() => {
      expect(result.current.isLoadingCatalog).toBe(false);
    });

    // Then holdings request resolves and fills data.
    await waitFor(() => {
      expect(result.current.isLoadingHoldings).toBe(false);
      expect(result.current.holdings).toHaveLength(1);
    });

    // Assert final derived state and endpoint call order.
    expect(result.current.activeEtfId).toBe("ETF1");
    expect(result.current.latestDate).toBe("2026-04-15");
    expect(result.current.errorMessage).toBe("");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/etfs");
    expect(fetchMock.mock.calls[1][0]).toBe("/etfs/ETF1/holdings");
  });

  it("surfaces request error when the catalog call fails", async () => {
    // Arrange: first request returns a non-OK status.
    fetchMock.mockResolvedValueOnce(mockJsonResponse({}, 500));

    const { result } = renderHook(() => useETFHoldings());

    // Wait until the hook exits loading state.
    await waitFor(() => {
      expect(result.current.isLoadingCatalog).toBe(false);
    });

    // Error state should be exposed and no holdings should be present.
    expect(result.current.errorMessage).toBe("Request failed with status 500.");
    expect(result.current.activeEtfId).toBe("");
    expect(result.current.holdings).toEqual([]);
  });

  it("refreshes holdings when active ETF changes", async () => {
    // Arrange: catalog + first ETF + second ETF responses.
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          items: [
            { id: "ETF1", constituent_count: 2 },
            { id: "ETF2", constituent_count: 1 },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          etf_id: "ETF1",
          latest_date: "2026-04-15",
          items: [
            {
              name: "AAPL",
              weight: 12.5,
              latest_close: 189.44,
              latest_holding_value: 23.68,
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          etf_id: "ETF2",
          latest_date: "2026-04-15",
          items: [
            {
              name: "TSLA",
              weight: 100,
              latest_close: 177.03,
              latest_holding_value: 177.03,
            },
          ],
        })
      );

    const { result } = renderHook(() => useETFHoldings());

    // Initial selected ETF should populate with first payload.
    await waitFor(() => {
      expect(result.current.holdings[0]?.name).toBe("AAPL");
    });

    // Trigger selection change.
    act(() => {
      result.current.setActiveEtfId("ETF2");
    });

    // Hook should refetch and expose second ETF holdings.
    await waitFor(() => {
      expect(result.current.activeEtfId).toBe("ETF2");
      expect(result.current.holdings[0]?.name).toBe("TSLA");
    });

    // Verify endpoint call sequence includes ETF2 refresh.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe("/etfs/ETF2/holdings");
  });
});
