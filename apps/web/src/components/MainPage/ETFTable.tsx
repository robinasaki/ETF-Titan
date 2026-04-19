import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
    Button,
    ScrollView,
    Separator,
    Text,
    XStack,
    YStack,
    useTheme,
} from "tamagui";
import type { ETFCatalogItem, ETFHolding } from "../../hooks/getETFHoldings";
import {
    formatDisplayDate,
    formatPercentage,
    formatUsdPrice,
    normalizeSymbol,
} from "../../utils/formatters";
import { AppButton } from "../Common/AppButton";
import { AppInput, type AppInputRef } from "../Common/AppInput";
import {
    IconAdjustmentsHorizontal,
    IconArrowLeft,
    IconUpload,
} from "@tabler/icons-react";

type SortKey = "name" | "weight" | "latest_close";
type SortDirection = "asc" | "desc";

type SortState = {
    key: SortKey;
    direction: SortDirection;
};

type HeaderCellProps = {
    activeSort: SortState;
    label: string;
    sortKey: SortKey;
    width: number | string;
    onPress: (sortKey: SortKey) => void;
};

type ETFRowData = {
    id: string;
    constituent_count: number;
};

type ETFRowProps = {
    etf: ETFRowData;
    isActive: boolean;
    onPress: (etfId: string) => void;
};

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
    searchInputRef?: RefObject<AppInputRef | null>;
    searchResetVersion?: number;
};

const INITIAL_SORT: SortState = {
    key: "name",
    direction: "asc",
};

const SYMBOL_COLUMN_WIDTH = "35%";
const WEIGHT_COLUMN_WIDTH = "25%";
const CLOSE_COLUMN_WIDTH = "40%";
const DATA_TABLE_MIN_WIDTH = 700;
const CONTROLS_COLUMN_WIDTH = 260;
const COLLAPSED_CONTROLS_TOGGLE_WIDTH = 52;
const HOLDINGS_ROWS_MAX_HEIGHT = 720;
const ETF_SELECTOR_MAX_HEIGHT = 420;
const CONTROLS_TOGGLE_TRANSITION = "220ms cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Sorter helper for the table columns.
 */
function compareValues(
    left: string | number,
    right: string | number,
    direction: SortDirection
) {
    const multiplier = direction === "asc" ? 1 : -1;

    if (typeof left === "string" && typeof right === "string") {
        return left.localeCompare(right) * multiplier;
    }

    return (Number(left) - Number(right)) * multiplier;
}

function getSortIndicator(sortKey: SortKey, activeSort: SortState) {
    if (activeSort.key !== sortKey) {
        return " ";
    }

    return activeSort.direction === "asc" ? "↑" : "↓";
}

function HeaderCell({
    activeSort,
    label,
    sortKey,
    width,
    onPress,
}: HeaderCellProps) {
    const theme = useTheme();
    const sortIndicator = getSortIndicator(sortKey, activeSort);

    return (
        <Button
            unstyled
            onPress={() => {
                onPress(sortKey);
            }}
            width={width}
            paddingVertical={12}
            alignItems="center"
            hoverStyle={{
                opacity: 0.85,
            }}
            pressStyle={{
                opacity: 0.7,
            }}
            cursor="pointer"
        >
            <XStack alignItems="center" gap={6}>
                <Text
                    color={theme.textReversePrimary}
                    fontSize={14}
                    fontWeight="700"
                    textTransform="uppercase"
                    letterSpacing={0.4}
                >
                    {label}
                </Text>

                <Text
                    color={theme.textReversePrimary}
                    fontSize={14}
                    fontWeight="700"
                    minWidth={14}
                    textAlign="center"
                >
                    {sortIndicator}
                </Text>
            </XStack>
        </Button>
    );
}

function ETFRow({ etf, isActive, onPress }: ETFRowProps) {
    const theme = useTheme();
    const defaultBackgroundColor = theme.background?.val;
    const activeBackgroundColor = theme.paneSecondary?.val;

    return (
        <Button
            unstyled
            onPress={() => {
                onPress(etf.id);
            }}
            paddingVertical={24}
            marginVertical={12}
            width="100%"
            backgroundColor={isActive ? activeBackgroundColor : defaultBackgroundColor}
            borderWidth={0}
            hoverStyle={{
                backgroundColor: theme.paneHover,
                cursor: "pointer"
            }}
        >
            <Text color={theme.paneTextPrimary} fontSize={16} fontWeight="600">
                {etf.id}: <Text color={theme.textMuted} fontSize={14}> {etf.constituent_count} symbols</Text>
            </Text>
        </Button>
    );
}

export function ETFTable({
    asOfDate,
    activeEtfId,
    etfs,
    holdings,
    isLoadingHoldings,
    errorMessage,
    refreshHoldings,
    uploadEtfCsv,
    setActiveEtfId,
    searchInputRef,
    searchResetVersion = 0,
}: ETFTableProps) {
    const theme = useTheme();
    const [searchValue, setSearchValue] = useState("");
    const [activeSort, setActiveSort] = useState<SortState>(INITIAL_SORT);
    const [isControlsExpanded, setIsControlsExpanded] = useState(true);
    const uploadInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setSearchValue("");
    }, [searchResetVersion]);

    const visibleHoldings = useMemo(() => {
        const normalizedSearchValue = normalizeSymbol(searchValue);
        const filteredHoldings = normalizedSearchValue
            ? holdings.filter((holding) =>
                normalizeSymbol(holding.name).includes(normalizedSearchValue)
            )
            : holdings;

        return [...filteredHoldings].sort((leftHolding, rightHolding) =>
            compareValues(
                leftHolding[activeSort.key],
                rightHolding[activeSort.key],
                activeSort.direction
            )
        );
    }, [activeSort, holdings, searchValue]);

    const holdingsCount = visibleHoldings.length;

    // Control pane collapse/expand logic
    const controlsColumnWidth = isControlsExpanded ? CONTROLS_COLUMN_WIDTH : 0;
    const controlsPaneOpacity = isControlsExpanded ? 1 : 0;
    const collapsedToggleOpacity = isControlsExpanded ? 0 : 1;
    const combinedTableMinWidth = controlsColumnWidth + DATA_TABLE_MIN_WIDTH;

    // Handle sort
    const handleSortPress = (sortKey: SortKey) => {
        setActiveSort((currentSort) => {
            if (currentSort.key !== sortKey) {
                return {
                    key: sortKey,
                    direction: sortKey === "name" ? "asc" : "desc",
                };
            }

            return {
                key: sortKey,
                direction: currentSort.direction === "asc" ? "desc" : "asc",
            };
        });
    };

    return (
        <YStack>
            {errorMessage ? (
                        <YStack gap={14} padding={24}>
                            <Text color={theme.red10} fontSize={16} fontWeight="600">
                                {errorMessage}
                            </Text>

                            <XStack>
                                <Button
                                    onPress={() => {
                                        void refreshHoldings();
                                    }}
                                    backgroundColor={theme.panePrimary}
                                    borderRadius={12}
                                    cursor="pointer"
                                    hoverStyle={{
                                        backgroundColor: theme.paneHover,
                                    }}
                                    pressStyle={{
                                        backgroundColor: theme.paneHover,
                                        scale: 0.98,
                                    }}
                                >
                                    <Text color={theme.paneTextPrimary} fontSize={14} fontWeight="600">
                                        Retry
                                    </Text>
                                </Button>
                            </XStack>
                        </YStack>
            ) : (
                <ScrollView horizontal contentContainerStyle={{ minWidth: "100%" }}>
                    <XStack minWidth={combinedTableMinWidth} width="100%" flex={1}>
                                <YStack
                                    width={controlsColumnWidth}
                                    minWidth={controlsColumnWidth}
                                    opacity={controlsPaneOpacity}
                                    overflow="hidden"
                                    pointerEvents={isControlsExpanded ? "auto" : "none"}
                                    borderRightWidth={1}
                                    borderRightColor={theme.paneBorderPrimary}
                                    style={{
                                        transition: `width ${CONTROLS_TOGGLE_TRANSITION}, opacity ${CONTROLS_TOGGLE_TRANSITION}`,
                                    }}
                                >
                                    <YStack
                                        width={CONTROLS_COLUMN_WIDTH}
                                        minWidth={CONTROLS_COLUMN_WIDTH}
                                    >
                                        <XStack>
                                            <Button
                                                onPress={() => {
                                                    setIsControlsExpanded(false);
                                                }}
                                                width="100%"
                                                justifyContent="flex-start"
                                                alignItems="center"
                                                borderRadius={0}
                                                background={theme.paneSecondary?.val}
                                                paddingVertical={26}
                                                icon={
                                                    <IconArrowLeft
                                                        color={theme.textPaneSecondary?.val}
                                                        size={18}
                                                        strokeWidth={2}
                                                    />
                                                }
                                            >
                                                <Text color={theme.textPaneSecondary?.val} fontSize={16}>
                                                    Controls
                                                </Text>
                                            </Button>
                                        </XStack>

                                        <YStack borderRightWidth={1} borderColor={theme.borderColor}>
                                            <YStack padding={16}>
                                                <YStack>
                                                    <XStack marginTop={6}>
                                                        <Text color={theme.textPrimary} fontSize={16} fontWeight="700">
                                                            ETF Table
                                                        </Text>
                                                    </XStack>

                                                    <XStack marginTop={6}>
                                                        <Text color={theme.textSecondary} fontSize={14}>
                                                            Upload or select an ETF and filter the visible symbols.
                                                        </Text>
                                                    </XStack>

                                                    <XStack marginTop={6}>
                                                        <Text color={theme.textMuted} fontSize={12}>
                                                            {asOfDate
                                                                ? `As of ${formatDisplayDate(asOfDate)}`
                                                                : "As of latest close"}
                                                        </Text>
                                                    </XStack>

                                                    <YStack marginTop={14}>
                                                        <input
                                                            ref={uploadInputRef}
                                                            type="file"
                                                            accept=".csv,text/csv"
                                                            style={{ display: "none" }}
                                                            onChange={(event) => {
                                                                const selectedFile = event.target.files?.[0];
                                                                event.target.value = "";
                                                                if (!selectedFile) {
                                                                    return;
                                                                }
                                                                void uploadEtfCsv(selectedFile);
                                                            }}
                                                        />

                                                        <AppButton
                                                            tone="primary"
                                                            icon={IconUpload}
                                                            maxWidth="100%"
                                                            onPress={() => {
                                                                uploadInputRef.current?.click();
                                                            }}
                                                        >
                                                            Upload ETF CSV
                                                        </AppButton>
                                                    </YStack>
                                                </YStack>
                                            </YStack>

                                            <YStack paddingHorizontal={10} paddingBottom={24}>
                                                <AppInput
                                                    ref={searchInputRef}
                                                    value={searchValue}
                                                    onChangeText={setSearchValue}
                                                    placeholder="Search a symbol..."
                                                />
                                            </YStack>

                                            <ScrollView
                                                maxHeight={ETF_SELECTOR_MAX_HEIGHT}
                                                showsVerticalScrollIndicator
                                            >
                                                <YStack gap={10}>
                                                    {etfs.map((etf) => {
                                                        return (
                                                            <ETFRow
                                                                key={etf.id}
                                                                etf={etf}
                                                                isActive={etf.id === activeEtfId}
                                                                onPress={setActiveEtfId}
                                                            />
                                                        );
                                                    })}
                                                </YStack>
                                            </ScrollView>
                                        </YStack>
                                    </YStack>
                                </YStack>

                                <YStack position="relative" flex={1} minWidth={DATA_TABLE_MIN_WIDTH}>
                                    <YStack
                                        position="absolute"
                                        top={0}
                                        left={0}
                                        zIndex={10}
                                        opacity={collapsedToggleOpacity}
                                        pointerEvents={isControlsExpanded ? "none" : "auto"}
                                        style={{
                                            transition: `opacity ${CONTROLS_TOGGLE_TRANSITION}`,
                                        }}
                                    >
                                        <Button
                                            borderRadius={0}
                                            background={theme.paneSecondary?.val}
                                            height={COLLAPSED_CONTROLS_TOGGLE_WIDTH}
                                            width={COLLAPSED_CONTROLS_TOGGLE_WIDTH}
                                            justifyContent="center"
                                            padding={0}
                                            icon={
                                                <IconAdjustmentsHorizontal
                                                    color={theme.textPaneSecondary?.val}
                                                    size={20}
                                                    strokeWidth={2}
                                                />
                                            }
                                            onPress={() => {
                                                setIsControlsExpanded(true);
                                            }}
                                        />
                                    </YStack>

                                    <XStack
                                        width="100%"
                                        backgroundColor={theme.background}
                                        borderBottomWidth={1}
                                        borderBottomColor={theme.paneBorderPrimary}
                                    >
                                        <HeaderCell
                                            activeSort={activeSort}
                                            label="Symbol"
                                            sortKey="name"
                                            width={SYMBOL_COLUMN_WIDTH}
                                            onPress={handleSortPress}
                                        />

                                        <HeaderCell
                                            activeSort={activeSort}
                                            label="Weight"
                                            sortKey="weight"
                                            width={WEIGHT_COLUMN_WIDTH}
                                            onPress={handleSortPress}
                                        />

                                        <HeaderCell
                                            activeSort={activeSort}
                                            label="Latest Close"
                                            sortKey="latest_close"
                                            width={CLOSE_COLUMN_WIDTH}
                                            onPress={handleSortPress}
                                        />
                                    </XStack>

                                    {holdingsCount === 0 && !isLoadingHoldings ? (
                                        <YStack padding={24}>
                                            <Text color={theme.textPrimary} fontSize={15}>
                                                No holdings matched the current filter.
                                            </Text>
                                        </YStack>
                                    ) : (
                                        <ScrollView
                                            maxHeight={HOLDINGS_ROWS_MAX_HEIGHT}
                                            showsVerticalScrollIndicator
                                        >
                                            {visibleHoldings.map((holding, index) => (
                                                <YStack key={`${holding.name}-${holding.weight}`}>
                                                    <XStack
                                                        width="100%"
                                                        alignItems="center"
                                                        minHeight={60}
                                                        paddingVertical={6}
                                                        backgroundColor={
                                                            index % 2 === 0 ? theme.background : "transparent"
                                                        }
                                                        hoverStyle={{
                                                            backgroundColor: theme.paneHover,
                                                        }}
                                                    >
                                                        <XStack
                                                            width={SYMBOL_COLUMN_WIDTH}
                                                            paddingHorizontal={18}
                                                            justifyContent="flex-start"
                                                        >
                                                            <Text
                                                                color={theme.color}
                                                                fontSize={15}
                                                                fontWeight="600"
                                                            >
                                                                {holding.name}
                                                            </Text>
                                                        </XStack>

                                                        <XStack
                                                            width={WEIGHT_COLUMN_WIDTH}
                                                            paddingHorizontal={18}
                                                            justifyContent="flex-end"
                                                        >
                                                            <Text color={theme.color} fontSize={15}>
                                                                {formatPercentage(holding.weight)}
                                                            </Text>
                                                        </XStack>

                                                        <XStack
                                                            width={CLOSE_COLUMN_WIDTH}
                                                            paddingHorizontal={18}
                                                            justifyContent="flex-end"
                                                        >
                                                            <Text
                                                                color={theme.color}
                                                                fontSize={15}
                                                                fontWeight="500"
                                                            >
                                                                {formatUsdPrice(holding.latest_close)}
                                                            </Text>
                                                        </XStack>
                                                    </XStack>

                                                    {index < holdingsCount - 1 ? (
                                                        <Separator borderColor={theme.paneBorderPrimary} />
                                                    ) : null}
                                                </YStack>
                                            ))}
                                        </ScrollView>
                                    )}
                                </YStack>
                            </XStack>
                        </ScrollView>
                    )}
        </YStack>
    );
}
