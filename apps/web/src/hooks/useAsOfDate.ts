import { useCallback, useEffect, useMemo, useState } from "react";

type UseAsOfDateResult = {
  asOfDate: string;
  debouncedAsOfDate: string;
  setAsOfDate: (date: string) => void;
  resetAsOfDate: () => void;
};

/**
 * Centralize as-of date state from timeline brush interactions.
 */
export function useAsOfDate(
  debounceMs: number
): UseAsOfDateResult {
  const [asOfDate, setAsOfDate] = useState("");
  const [debouncedAsOfDate, setDebouncedAsOfDate] = useState("");

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedAsOfDate(asOfDate);
    }, debounceMs);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [asOfDate, debounceMs]);

  const resetAsOfDate = useCallback(() => {
    setAsOfDate("");
    setDebouncedAsOfDate("");
  }, []);

  return useMemo(
    () => ({
      asOfDate,
      debouncedAsOfDate,
      setAsOfDate,
      resetAsOfDate,
    }),
    [asOfDate, debouncedAsOfDate, resetAsOfDate]
  );
}
