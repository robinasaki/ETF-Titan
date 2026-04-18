import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useETFTopHoldings } from "./useETFTopHoldings";

function mockJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("useETFTopHoldings", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads top holdings for the selected ETF", async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        etf_id: "ETF1",
        latest_date: "2026-04-17",
        limit: 5,
        items: [
          {
            name: "AAPL",
            weight: 0.2,
            latest_close: 187.2,
            latest_holding_value: 37.44,
          },
        ],
      })
    );

    const { result } = renderHook(() => useETFTopHoldings("ETF1"));

    await waitFor(() => {
      expect(result.current.isLoadingTopHoldings).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/etfs/ETF1/top-holdings?limit=5");
    expect(result.current.latestDate).toBe("2026-04-17");
    expect(result.current.topHoldings).toHaveLength(1);
    expect(result.current.topHoldingsErrorMessage).toBe("");
  });

  it("returns empty state when ETF is not selected", async () => {
    const { result } = renderHook(() => useETFTopHoldings(""));

    await waitFor(() => {
      expect(result.current.isLoadingTopHoldings).toBe(false);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.latestDate).toBe("");
    expect(result.current.topHoldings).toEqual([]);
    expect(result.current.topHoldingsErrorMessage).toBe("");
  });

  it("supports manual refresh after initial load", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          etf_id: "ETF2",
          latest_date: "2026-04-16",
          limit: 5,
          items: [
            {
              name: "MSFT",
              weight: 0.19,
              latest_close: 411.2,
              latest_holding_value: 78.128,
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          etf_id: "ETF2",
          latest_date: "2026-04-17",
          limit: 5,
          items: [
            {
              name: "NVDA",
              weight: 0.22,
              latest_close: 905.1,
              latest_holding_value: 199.122,
            },
          ],
        })
      );

    const { result } = renderHook(() => useETFTopHoldings("ETF2"));

    await waitFor(() => {
      expect(result.current.latestDate).toBe("2026-04-16");
    });

    await act(async () => {
      await result.current.refreshTopHoldings();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.latestDate).toBe("2026-04-17");
    expect(result.current.topHoldings[0]?.name).toBe("NVDA");
  });
});
