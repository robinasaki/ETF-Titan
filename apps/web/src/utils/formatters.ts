const usdPriceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

const weightFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/**
 * Format a number as a USD price string.
 */
export function formatUsdPrice(value: number): string {
  return `$${usdPriceFormatter.format(value)}`;
}

/**
 * Format a portfolio weight for table display.
 */
export function formatWeight(value: number): string {
  return weightFormatter.format(value);
}

/**
 * Format a decimal weight as a percentage string.
 */
export function formatPercentage(value: number): string {
  return percentageFormatter.format(value);
}

/**
 * Normalize ETF symbols and search tokens for consistent comparisons.
 */
export function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Keep date formatting centralized for chart and table labels.
 */
export function formatDisplayDate(value: string): string {
  return value;
}
