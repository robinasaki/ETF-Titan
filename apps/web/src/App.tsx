import { useCallback, useMemo, useRef, useState } from "react";
import { YStack } from "tamagui";
import { ETFPriceSeriesPanel } from "./components/MainPage/ETFPriceSeriesPanel";
import { MainHeader } from "./components/MainPage/MainHeader";
import { ETFTable } from "./components/MainPage/ETFTable";
import { ETFTableHeader } from "./components/MainPage/ETFTableHeader";
import { ETFTopHoldingsPanel } from "./components/MainPage/ETFTopHoldingsPanel";
import { useETFHoldings } from "./hooks/getETFHoldings";
import { useKeyboardShortcutRegistration } from "./shortcuts/KeyboardShortcutLayer";
import { formatDisplayDate } from "./utils/formatters";

export default function App() {
  const {
    activeEtfId,
    errorMessage,
    etfs,
    holdings,
    isLoadingCatalog,
    isLoadingHoldings,
    latestDate,
    refreshHoldings,
    setActiveEtfId,
  } = useETFHoldings();
  const isLoading = isLoadingCatalog || isLoadingHoldings;
  const summaryLabel = latestDate
    ? `${holdings.length} holdings · latest close ${formatDisplayDate(latestDate)}`
    : `${holdings.length} holdings`;
  const searchInputRef = useRef<any>(null);
  const [searchResetVersion, setSearchResetVersion] = useState(0);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus?.();
  }, []);
  const blurSearch = useCallback(() => {
    searchInputRef.current?.blur?.();
    setSearchResetVersion((currentVersion) => currentVersion + 1);
  }, []);

  const etfSelectionIndex = useMemo(
    () => etfs.findIndex((etf) => etf.id === activeEtfId),
    [activeEtfId, etfs]
  );

  const selectRelativeEtf = useCallback(
    (offset: number) => {
      if (etfs.length === 0) {
        return;
      }

      const currentIndex = etfSelectionIndex >= 0 ? etfSelectionIndex : 0;
      const nextIndex = (currentIndex + offset + etfs.length) % etfs.length;
      const nextEtfId = etfs[nextIndex]?.id;
      if (nextEtfId) {
        setActiveEtfId(nextEtfId);
      }
    },
    [etfSelectionIndex, etfs, setActiveEtfId]
  );

  const selectPreviousEtf = useCallback(() => {
    selectRelativeEtf(-1);
  }, [selectRelativeEtf]);

  const selectNextEtf = useCallback(() => {
    selectRelativeEtf(1);
  }, [selectRelativeEtf]);

  useKeyboardShortcutRegistration({
    focusSearch,
    blurSearch,
    selectPreviousEtf,
    selectNextEtf,
  });

  return (
    <YStack paddingHorizontal={24} paddingBottom={24} paddingTop={12}>
      <MainHeader />

      <YStack
        width="100%"
        maxWidth={1100}
        marginHorizontal="auto"
        borderWidth={1}
        borderColor="$paneBorderPrimary"
        marginTop={14}
        borderRadius={20}
        overflow="hidden"
        backgroundColor="$background"
      >
        <ETFTableHeader
          activeEtfId={activeEtfId}
          summaryLabel={summaryLabel}
          isLoading={isLoading}
        />
        <ETFPriceSeriesPanel etfId={activeEtfId} />
        <ETFTopHoldingsPanel etfId={activeEtfId} />
        <ETFTable
          activeEtfId={activeEtfId}
          etfs={etfs}
          holdings={holdings}
          isLoadingHoldings={isLoadingHoldings}
          errorMessage={errorMessage}
          refreshHoldings={refreshHoldings}
          setActiveEtfId={setActiveEtfId}
          searchInputRef={searchInputRef}
          searchResetVersion={searchResetVersion}
        />
      </YStack>
    </YStack>
  );
}
