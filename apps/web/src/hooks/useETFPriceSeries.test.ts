import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useETFPriceSeries } from "./useETFPriceSeries";

function mockJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("useETFPriceSeries", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Test 1: Select ETF1, are the reconstructed prices correct?
   */
  it("loads reconstructed prices for the selected ETF", async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        etf_id: "ETF1",
        latest_date: "2026-04-17",
        items: [
          { date: "2026-04-15", price: 101.15 },
          { date: "2026-04-16", price: 102.04 },
        ],
      })
    );

    const { result } = renderHook(() => useETFPriceSeries("ETF1"));

    await waitFor(() => {
      expect(result.current.isLoadingPriceSeries).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/etfs/ETF1/price-series");
    expect(result.current.latestDate).toBe("2026-04-17");
    expect(result.current.priceSeries).toHaveLength(2);
    expect(result.current.priceSeriesErrorMessage).toBe("");
  });

  /**
   * Test 2: Does it return an empty ETF when not selected?
   */
  it("returns empty state when ETF is not selected", async () => {
    const { result } = renderHook(() => useETFPriceSeries(""));

    await waitFor(() => {
      expect(result.current.isLoadingPriceSeries).toBe(false);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.latestDate).toBe("");
    expect(result.current.priceSeries).toEqual([]);
    expect(result.current.priceSeriesErrorMessage).toBe("");
  });

  /**
   * Test 3: Is the update behaviour working?
   */
  it("supports manual refresh after initial load", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          etf_id: "ETF2",
          latest_date: "2026-04-16",
          items: [{ date: "2026-04-16", price: 199.21 }],
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          etf_id: "ETF2",
          latest_date: "2026-04-17",
          items: [{ date: "2026-04-17", price: 201.89 }],
        })
      );

    // Mounts the hook call.
    const { result } = renderHook(() => useETFPriceSeries("ETF2"));

    // Waits till first async fetch is done.
    await waitFor(() => {
      expect(result.current.latestDate).toBe("2026-04-16");
    });

    // Trigger refresh manually.
    await act(async () => {
      await result.current.refreshPriceSeries();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.latestDate).toBe("2026-04-17");
    expect(result.current.priceSeries[0]?.price).toBe(201.89);
  });
});
