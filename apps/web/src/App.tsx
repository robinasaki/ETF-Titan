import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { YStack } from "tamagui";
import { ETFPriceSeriesPanel } from "./components/MainPage/ETFPriceSeriesPanel";
import { MainHeader } from "./components/MainPage/MainHeader";
import { ETFTable } from "./components/MainPage/ETFTable";
import { ETFTableHeader } from "./components/MainPage/ETFTableHeader";
import { ETFTopHoldingsPanel } from "./components/MainPage/ETFTopHoldingsPanel";
import { Toast } from "./components/Common/Toast";
import { useETFHoldings } from "./hooks/getETFHoldings";
import { useKeyboardShortcutRegistration } from "./shortcuts/KeyboardShortcutLayer";
import { formatDisplayDate } from "./utils/formatters";

const BRUSH_RESPONSE_DEBOUNCE_MS = 100;

export default function App() {
  const [asOfDate, setAsOfDate] = useState("");
  const [debouncedAsOfDate, setDebouncedAsOfDate] = useState("");
  const {
    activeEtfId,
    errorMessage,
    etfs,
    holdings,
    isLoadingCatalog,
    isLoadingHoldings,
    latestDate,
    uploadToastMessage,
    refreshHoldings,
    uploadEtfCsv,
    clearUploadToast,
    setActiveEtfId,
  } = useETFHoldings(debouncedAsOfDate);
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

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedAsOfDate(asOfDate);
    }, BRUSH_RESPONSE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [asOfDate]);

  useEffect(() => {
    setAsOfDate("");
    setDebouncedAsOfDate("");
  }, [activeEtfId]);

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
        position="relative"
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
        <ETFPriceSeriesPanel etfId={activeEtfId} onAsOfDateChange={setAsOfDate} />
        <ETFTopHoldingsPanel etfId={activeEtfId} asOfDate={debouncedAsOfDate} />
        <ETFTable
          activeEtfId={activeEtfId}
          etfs={etfs}
          holdings={holdings}
          isLoadingHoldings={isLoadingHoldings}
          errorMessage={errorMessage}
          refreshHoldings={refreshHoldings}
          uploadEtfCsv={uploadEtfCsv}
          setActiveEtfId={setActiveEtfId}
          searchInputRef={searchInputRef}
          searchResetVersion={searchResetVersion}
        />
        {uploadToastMessage ? (
          <Toast
            message={uploadToastMessage}
            onDismiss={clearUploadToast}
          />
        ) : null}
      </YStack>
    </YStack>
  );
}
