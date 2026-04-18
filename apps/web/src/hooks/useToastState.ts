import { useCallback, useState } from "react";

type UseToastStateResult = {
  toastMessage: string;
  showToast: (message: string) => void;
  clearToast: () => void;
};

/**
 * Centralized toast state operations for feature hooks/components.
 */
export function useToastState(): UseToastStateResult {
  const [toastMessage, setToastMessage] = useState("");

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage("");
  }, []);

  return {
    toastMessage,
    showToast,
    clearToast,
  };
}
