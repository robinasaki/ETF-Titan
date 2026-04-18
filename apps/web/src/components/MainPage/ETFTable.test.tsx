import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { ETFTable } from "./ETFTable";
import { renderWithProviders } from "../../test/renderWithProviders";
import type { ETFCatalogItem, ETFHolding } from "../../hooks/getETFHoldings";

type ETFTableProps = {
  asOfDate: string;
  activeEtfId: string;
  etfs: ETFCatalogItem[];
  holdings: ETFHolding[];
  isLoadingHoldings: boolean;
  errorMessage: string;
  refreshHoldings: () => Promise<void>;
  uploadEtfCsv: (file: File) => Promise<void>;
  setActiveEtfId: (etfId: string) => void;
};

function createProps(overrides: Partial<ETFTableProps> = {}): ETFTableProps {
  return {
    asOfDate: "",
    activeEtfId: "ETF1",
    etfs: [{ id: "ETF1", constituent_count: 3 }],
    holdings: [],
    isLoadingHoldings: false,
    errorMessage: "",
    refreshHoldings: vi.fn(async () => {}),
    uploadEtfCsv: vi.fn(async () => {}),
    setActiveEtfId: vi.fn(),
    ...overrides,
  };
}

/**
 * Assert relative DOM order for two visible text nodes.
 */
function expectTextToAppearBefore(firstText: string, secondText: string) {
  const firstNode = screen.getByText(firstText);
  const secondNode = screen.getByText(secondText);
  const position = firstNode.compareDocumentPosition(secondNode);
  const follows = Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING);

  expect(follows).toBe(true);
}

describe("ETFTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders active ETF in controls list", () => {
    const props = createProps({
      holdings: [
        { name: "AAPL", weight: 25.1, latest_close: 190.21, latest_holding_value: 47.76 },
        { name: "MSFT", weight: 22.4, latest_close: 421.1, latest_holding_value: 94.33 },
      ],
    });

    renderWithProviders(<ETFTable {...props} />);

    expect(screen.getByText("ETF1:")).toBeInTheDocument();
  });

  it("filters visible holdings by search input", async () => {
    const user = userEvent.setup();

    const props = createProps({
      holdings: [
        { name: "AAPL", weight: 10, latest_close: 150, latest_holding_value: 15 },
        { name: "MSFT", weight: 20, latest_close: 420, latest_holding_value: 84 },
        { name: "GOOG", weight: 30, latest_close: 170, latest_holding_value: 51 },
      ],
    });

    renderWithProviders(<ETFTable {...props} />);

    // Sanity-check baseline rows before filtering.
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();
    expect(screen.getByText("GOOG")).toBeInTheDocument();

    // Typing a partial symbol should narrow list client-side.
    await user.type(screen.getByPlaceholderText("Search a symbol..."), "ms");

    // Only the matching symbol should remain rendered.
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();
    expect(screen.queryByText("GOOG")).not.toBeInTheDocument();
  });

  it("sorts holdings by selected column", async () => {
    const user = userEvent.setup();

    const props = createProps({
      holdings: [
        { name: "AAPL", weight: 5, latest_close: 150, latest_holding_value: 7.5 },
        { name: "MSFT", weight: 20, latest_close: 420, latest_holding_value: 84 },
        { name: "GOOG", weight: 10, latest_close: 170, latest_holding_value: 17 },
      ],
    });

    renderWithProviders(<ETFTable {...props} />);

    // Initial symbol sort is ascending by default.
    expectTextToAppearBefore("AAPL", "GOOG");
    expectTextToAppearBefore("GOOG", "MSFT");

    // Sorting by weight first switches to descending for numeric columns.
    await user.click(screen.getByRole("button", { name: /weight/i }));

    expectTextToAppearBefore("MSFT", "GOOG");
    expectTextToAppearBefore("GOOG", "AAPL");
  });

  it("renders error state and retries holdings request", async () => {
    const user = userEvent.setup();
    const refreshHoldings = vi.fn(async () => {});

    const props = createProps({
      errorMessage: "Request failed with status 500.",
      refreshHoldings,
    });

    renderWithProviders(<ETFTable {...props} />);

    // Error text from hook state must be visible to the user.
    expect(screen.getByText("Request failed with status 500.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    // Retry CTA should delegate directly to hook refresh logic.
    expect(refreshHoldings).toHaveBeenCalledTimes(1);
  });
});
