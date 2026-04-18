import { useMemo } from "react";
import { Spinner, Text, XStack, YStack, useTheme } from "tamagui";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useETFTopHoldings } from "../../hooks/useETFTopHoldings";
import { formatDisplayDate, formatPercentage, formatUsdPrice } from "../../utils/formatters";
import { AppButton } from "../Common/AppButton";

type TopHoldingBar = {
  name: string;
  weight: number;
  latestClose: number;
  holdingSize: number;
  fill: string;
};

type ETFTopHoldingsPanelProps = {
  etfId: string;
  asOfDate?: string;
};

const TOP_HOLDINGS_CHART_HEIGHT = 240;
const TOP_HOLDINGS_MAX_COUNT = 5;
const TOP_HOLDINGS_COLORS = [
  "#2563EB",
  "#0F766E",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#475569",
] as const;

/**
 * Build top-five bar rows sorted by holding value.
 */
function buildTopHoldingBars(
  topHoldings: ReturnType<typeof useETFTopHoldings>["topHoldings"]
): TopHoldingBar[] {
  return [...topHoldings]
    .map((item, index) => ({
      name: item.name,
      weight: item.weight,
      latestClose: item.latest_close,
      holdingSize: item.weight * item.latest_close,
      fill: TOP_HOLDINGS_COLORS[index] ?? TOP_HOLDINGS_COLORS[0],
    }))
    .sort((left, right) => {
      if (right.holdingSize !== left.holdingSize) {
        return right.holdingSize - left.holdingSize;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, TOP_HOLDINGS_MAX_COUNT)
    .map((item, index) => ({
      ...item,
      fill: TOP_HOLDINGS_COLORS[index] ?? TOP_HOLDINGS_COLORS[0],
    }));
}

/**
 * Recharts bar tooltip to show holding details.
 */
function TopHoldingsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TopHoldingBar }>;
}) {
  const theme = useTheme();
  const bar = payload?.[0]?.payload;

  if (!active || !bar) {
    return null;
  }

  return (
    <YStack
      backgroundColor={theme.paneSecondary}
      borderWidth={1}
      borderColor={theme.paneBorderPrimary}
      borderRadius={10}
      padding={10}
      gap={4}
      minWidth={136}
    >
      <Text color={theme.textPrimary} fontSize={13} fontWeight="700">
        {bar.name}
      </Text>

      <Text color={theme.textPrimary} fontSize={12}>
        Holding size: {formatUsdPrice(bar.holdingSize)}
      </Text>

      <Text color={theme.textPrimary} fontSize={12}>
        Weight: {formatPercentage(bar.weight)}
      </Text>

      <Text color={theme.textPrimary} fontSize={12}>
        Latest price: {formatUsdPrice(bar.latestClose)}
      </Text>
    </YStack>
  );
}

/**
 * Bar chart for top holdings sized by latest market value.
 */
export function ETFTopHoldingsPanel({ etfId, asOfDate }: ETFTopHoldingsPanelProps) {
  const theme = useTheme();
  const {
    latestDate,
    isLoadingTopHoldings,
    topHoldings,
    topHoldingsErrorMessage,
    refreshTopHoldings,
  } = useETFTopHoldings(etfId, asOfDate);

  const bars = useMemo(() => buildTopHoldingBars(topHoldings), [topHoldings]);
  const hasPositiveBar = bars.some((bar) => bar.holdingSize > 0);
  const hasData = topHoldings.length > 0 && hasPositiveBar;

  return (
    <YStack
      borderTopWidth={1}
      borderTopColor={theme.paneBorderPrimary}
      borderBottomWidth={1}
      borderBottomColor={theme.paneBorderPrimary}
      padding={16}
      gap={12}
    >
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text color={theme.textPrimary} fontSize={16} fontWeight="700">
          Top 5 Holdings by Size
        </Text>

        {isLoadingTopHoldings ? <Spinner size="small" color={theme.textPrimary?.val} /> : null}
      </XStack>

      {latestDate ? (
        <Text color={theme.textSecondary} fontSize={13}>
          As of latest close {formatDisplayDate(latestDate)}
        </Text>
      ) : null}

      {topHoldingsErrorMessage ? (
        <YStack gap={8}>
          <Text color={theme.red10} fontSize={14}>
            {topHoldingsErrorMessage}
          </Text>

          <XStack>
            <AppButton
              tone="ghost"
              onPress={() => {
                void refreshTopHoldings();
              }}
            >
              Retry
            </AppButton>
          </XStack>
        </YStack>
      ) : null}

      {!topHoldingsErrorMessage && !hasData ? (
        <YStack
          borderWidth={1}
          borderColor={theme.paneBorderPrimary}
          borderRadius={12}
          padding={20}
          alignItems="center"
          justifyContent="center"
        >
          <Text color={theme.textSecondary} fontSize={14}>
            {isLoadingTopHoldings ? "Loading top holdings..." : "No top holdings data."}
          </Text>
        </YStack>
      ) : null}

      {!topHoldingsErrorMessage && hasData ? (
        <YStack height={TOP_HOLDINGS_CHART_HEIGHT}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 4, right: 8, left: 8, bottom: 12 }}>
              <CartesianGrid vertical={false} stroke={theme.paneBorderPrimary?.val} />

              <XAxis
                type="category"
                dataKey="name"
                tick={{ fill: theme.textSecondary?.val, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                type="number"
                tick={{ fill: theme.textSecondary?.val, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  typeof value === "number"
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(value)
                    : ""
                }
              />

              <Tooltip
                isAnimationActive={false}
                content={<TopHoldingsTooltip />}
                wrapperStyle={{ outline: "none" }}
              />

              <Bar dataKey="holdingSize" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </YStack>
      ) : null}
    </YStack>
  );
}
