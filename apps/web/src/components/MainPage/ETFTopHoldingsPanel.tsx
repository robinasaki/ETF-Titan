import { useMemo } from "react";
import { Spinner, Text, XStack, YStack, useTheme } from "tamagui";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useETFTopHoldings } from "../../hooks/useETFTopHoldings";
import { formatDisplayDate, formatPercentage, formatUsdPrice } from "../../utils/formatters";
import { AppButton } from "../Common/AppButton";

type TopHoldingSlice = {
  name: string;
  weight: number;
  latestClose: number | null;
  color: string;
};

type ETFTopHoldingsPanelProps = {
  etfId: string;
};

const TOP_HOLDINGS_CHART_HEIGHT = 200;
const TOP_HOLDINGS_ROW_PADDING = 10;
const TOP_HOLDINGS_ROW_HEIGHT = TOP_HOLDINGS_CHART_HEIGHT + TOP_HOLDINGS_ROW_PADDING * 2;
const TOP_HOLDINGS_TOTAL_WEIGHT = 1;
// Random colours.
const TOP_HOLDINGS_COLORS = [
  "#2D7FF9",
  "#12B886",
  "#FCC419",
  "#F783AC",
  "#AE3EC9",
  "#868E96",
] as const;

/**
 * Build exactly six pie slices from top holdings payload.
 */
function buildTopHoldingSlices(
  topHoldings: ReturnType<typeof useETFTopHoldings>["topHoldings"]
): TopHoldingSlice[] {
  const topFive = [...topHoldings]
    .sort((left, right) => {
      if (right.weight !== left.weight) {
        return right.weight - left.weight;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 5);
  const topFiveWeight = topFive.reduce((total, item) => total + item.weight, 0);
  const otherWeight = Math.max(0, TOP_HOLDINGS_TOTAL_WEIGHT - topFiveWeight);

  return [
    ...topFive.map((item, index) => ({
      name: item.name,
      weight: item.weight,
      latestClose: item.latest_close,
      color: TOP_HOLDINGS_COLORS[index] ?? TOP_HOLDINGS_COLORS[0],
    })),
    {
      name: "Other",
      weight: otherWeight,
      latestClose: null,
      color: TOP_HOLDINGS_COLORS[5],
    },
  ];
}

/**
 * Recharts pie tooltip to show weight and latest close.
 */
function TopHoldingsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TopHoldingSlice }>;
}) {
  const theme = useTheme();
  const slice = payload?.[0]?.payload;

  if (!active || !slice) {
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
        {slice.name}
      </Text>

      <Text color={theme.textPrimary} fontSize={12}>
        Weight: {formatPercentage(slice.weight)}
      </Text>

      <Text color={theme.textPrimary} fontSize={12}>
        Latest price: {slice.latestClose === null ? "N/A" : formatUsdPrice(slice.latestClose)}
      </Text>
    </YStack>
  );
}

/**
 * Pie chart for top five holdings plus the remaining portfolio.
 */
export function ETFTopHoldingsPanel({ etfId }: ETFTopHoldingsPanelProps) {
  const theme = useTheme();
  const {
    latestDate,
    isLoadingTopHoldings,
    topHoldings,
    topHoldingsErrorMessage,
    refreshTopHoldings,
  } = useETFTopHoldings(etfId);

  const slices = useMemo(() => buildTopHoldingSlices(topHoldings), [topHoldings]);
  const pieData = useMemo(
    () => slices.map((slice) => ({ ...slice, fill: slice.color })),
    [slices]
  );
  const hasPositiveSlice = slices.some((slice) => slice.weight > 0);
  const hasData = topHoldings.length > 0 && hasPositiveSlice;

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
          Top Holdings Distribution
        </Text>

        {isLoadingTopHoldings ? <Spinner size="small" color={theme.textPrimary?.val} /> : null}
      </XStack>

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
        <YStack
          height={TOP_HOLDINGS_ROW_HEIGHT}
          position="relative"
        >
          <XStack
            position="absolute"
            top={TOP_HOLDINGS_ROW_PADDING}
            right={TOP_HOLDINGS_ROW_PADDING}
            bottom={TOP_HOLDINGS_ROW_PADDING}
            left={TOP_HOLDINGS_ROW_PADDING}
            alignItems="center"
            justifyContent="space-between"
            gap={20}
          >
            <YStack height="100%" flex={1} minWidth={260}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="weight"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="78%"
                    isAnimationActive={false}
                  />

                  <Tooltip
                    isAnimationActive={false}
                    content={<TopHoldingsTooltip />}
                    wrapperStyle={{ outline: "none" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </YStack>

            {/* Legends */}
            <YStack width={140} gap={8} alignItems="flex-start" justifyContent="center">
              {slices.map((slice) => (
                <XStack
                  key={slice.name}
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="flex-start"
                  flexWrap="nowrap"
                  width="100%"
                  paddingVertical={2}
                >
                  <Text color={theme.textSecondary} fontSize={12} whiteSpace="nowrap" flexShrink={0}>
                    <Text color={slice.color} fontSize={20} paddingRight={4}>
                      ●
                    </Text>
                    {slice.name}: {formatPercentage(slice.weight)}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </XStack>
        </YStack>
      ) : null}
    </YStack>
  );
}
