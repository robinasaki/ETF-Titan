import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Spinner, Text, XStack, YStack, useTheme } from "tamagui";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useETFPriceSeries } from "../../hooks/useETFPriceSeries";
import { formatDisplayDate, formatUsdPrice } from "../../utils/formatters";
import { AppButton } from "../Common/AppButton";

type ETFPriceSeriesPanelProps = {
  etfId: string;
  onAsOfDateChange?: (date: string) => void;
};

type ChartPoint = {
  date: string;
  index: number;
  price: number;
};

type BrushRange = {
  startIndex: number;
  endIndex: number;
};

type PriceSeriesGraphProps = {
  data: ChartPoint[];
  shouldShowBrush: boolean;
  brushRange: BrushRange;
  onBrushRangeChange: (range: BrushRange) => void;
  isLoadingPriceSeries: boolean;
};

const CHART_HEIGHT = 260;

/**
 * Helper function for time series hover pane.
 */
function formatBrushLabel(value: number, data: ChartPoint[]): string {
  const point = data[value];
  return point ? formatDisplayDate(point.date) : "";
}


/**
 * The time series graph without frame.
 */
function PriceSeriesGraph({
  data,
  shouldShowBrush,
  brushRange,
  onBrushRangeChange,
  isLoadingPriceSeries,
}: PriceSeriesGraphProps) {
  const theme = useTheme();

  if (data.length === 0) {
    return (
      <XStack
        alignItems="center"
        justifyContent="center"
      >
        <Text color={theme.textSecondary} fontSize={14}>
          {isLoadingPriceSeries ? "Loading reconstructed price history..." : "No chart data."}
        </Text>
      </XStack>
    );
  }

  return (
    <YStack height={CHART_HEIGHT} width="100%">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 24,
            right: 100,
            left: 24,
            bottom: shouldShowBrush ? 16 : 0,
          }}
        >
          <CartesianGrid stroke={theme.paneBorderPrimary?.val} strokeDasharray="4 4" />

          <XAxis
            dataKey="date"
            tick={{ fill: theme.textMuted?.val, fontSize: 11 }}
            minTickGap={28}
            tickLine={false}
            axisLine={{ stroke: theme.paneBorderPrimary?.val }}
          />

          <YAxis
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value) => formatUsdPrice(Number(value))}
            width={80}
            tick={{ fill: theme.textMuted?.val, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: theme.paneBorderPrimary?.val }}
          />

          <Tooltip
            isAnimationActive={false}
            formatter={(value) => [formatUsdPrice(Number(value))]}
            labelFormatter={(label) => formatDisplayDate(String(label))}
            contentStyle={{
              backgroundColor: theme.paneSecondary?.val,
              border: `1px solid ${theme.paneBorderPrimary?.val}`,
              borderRadius: 10,
            }}
            labelStyle={{ color: theme.textPrimary?.val }}
            itemStyle={{ color: theme.textPrimary?.val }}
          />

          <Line
            type="monotone"
            dataKey="price"
            stroke={theme.lochmara?.val}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={false}
          />

          {shouldShowBrush ? (
            <Brush
              dataKey="index"
              startIndex={brushRange.startIndex}
              endIndex={brushRange.endIndex}
              travellerWidth={8}
              stroke={theme.brushInBound?.val}
              fill={theme.brushOutBound?.val}
              tickFormatter={(value) => formatBrushLabel(Number(value), data)}
              onChange={(range) => {
                const { startIndex, endIndex } = range ?? {};
                if (typeof startIndex !== "number" || typeof endIndex !== "number") {
                  return;
                }

                onBrushRangeChange({ startIndex, endIndex });
              }}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </YStack>
  );
}

/**
 * Given an ETF id, construct the entire interactive time series graph with frame.
 */
export function ETFPriceSeriesPanel({
  etfId,
  onAsOfDateChange,
}: ETFPriceSeriesPanelProps) {
  const theme = useTheme();
  const {
    latestDate,
    isLoadingPriceSeries,
    priceSeries,
    priceSeriesErrorMessage,
    refreshPriceSeries,
  } = useETFPriceSeries(etfId);

  // Again, if this is an industry project, I would virtualize this on hook level.
  // Transform the hook return to ChartPoint memos.
  const data = useMemo<ChartPoint[]>(
    () =>
      priceSeries.map((point, index) => ({
        date: point.date,
        index,
        price: point.price,
      })),
    [priceSeries]
  );

  // This can latter be changed by the brush.
  const [brushRange, setBrushRange] = useState<BrushRange>({
    startIndex: 0,
    endIndex: 0,
  });
  const [asOfIndex, setAsOfIndex] = useState(0);

  // Don't show brush if days <= 14.
  const shouldShowBrush = data.length > 14;

  // Full time series range for brush calc.
  const fullRange = useMemo(
    () => ({
      startIndex: 0,
      endIndex: Math.max(0, data.length - 1),
    }),
    [data.length]
  );
  const isResetZoomDisabled =
    !shouldShowBrush ||
    (brushRange.startIndex === fullRange.startIndex &&
      brushRange.endIndex === fullRange.endIndex);

  useEffect(() => {
    setBrushRange(fullRange);
    setAsOfIndex(fullRange.endIndex);
  }, [fullRange]);

  const handleBrushRangeChange = useCallback((nextRange: BrushRange) => {
    setBrushRange((previousRange) => {
      const movedStartOnly =
        nextRange.startIndex !== previousRange.startIndex &&
        nextRange.endIndex === previousRange.endIndex;
      setAsOfIndex(movedStartOnly ? nextRange.startIndex : nextRange.endIndex);
      return nextRange;
    });
  }, []);

  useEffect(() => {
    if (data.length === 0) {
      onAsOfDateChange?.("");
      return;
    }

    const boundedEndIndex = Math.min(
      Math.max(asOfIndex, 0),
      data.length - 1
    );
    const selectedPoint = data[boundedEndIndex];
    onAsOfDateChange?.(selectedPoint?.date ?? "");
  }, [asOfIndex, data, onAsOfDateChange]);

  return (
    <YStack
      borderBottomWidth={1}
      borderBottomColor={theme.paneBorderPrimary}
      padding={16}
      gap={12}
    >
      <XStack alignItems="center" flexWrap="nowrap" gap={8} position="relative" minHeight={32} paddingRight={124}>
        <Text
          color={theme.textPrimary}
          fontSize={16}
          fontWeight="700"
          paddingRight={6}
          whiteSpace="nowrap"
          flexShrink={0}
        >
          Price Overtime
        </Text>

        <XStack alignItems="center" gap={8} flexWrap="nowrap" minWidth={0} marginLeft="auto" paddingRight={8}>
          {isLoadingPriceSeries ? <Spinner size="small" color={theme.textPrimary?.val} /> : null}
        </XStack>

        <AppButton
          tone="primary"
          onPress={() => {
            setBrushRange(fullRange);
            setAsOfIndex(fullRange.endIndex);
          }}
          disabled={isResetZoomDisabled}
          position="absolute"
          right={0}
          top={0}
        >
          <Text color={theme.paneTextPrimary} fontSize={13} fontWeight="600" whiteSpace="nowrap">
            Reset zoom
          </Text>
        </AppButton>
      </XStack>

      {priceSeriesErrorMessage ? (
        <YStack gap={8}>
          <Text color={theme.red10} fontSize={14}>
            {priceSeriesErrorMessage}
          </Text>

          <XStack>
            <AppButton
              tone="ghost"
              onPress={() => {
                void refreshPriceSeries();
              }}
            >
              <Text color={theme.paneTextPrimary} fontSize={13} fontWeight="600">
                Retry
              </Text>
            </AppButton>
          </XStack>
        </YStack>
      ) : null}

      <PriceSeriesGraph
        data={data}
        shouldShowBrush={shouldShowBrush}
        brushRange={brushRange}
        onBrushRangeChange={handleBrushRangeChange}
        isLoadingPriceSeries={isLoadingPriceSeries}
      />
    </YStack>
  );
}
