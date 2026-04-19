import { useEffect, useRef, useState } from "react";
import { Spinner, YStack, useTheme } from "tamagui";

type LoadingSpinnerPaneProps = {
  isLoading: boolean;
};

const MIN_SPINNER_VISIBLE_MS = 100;

export function LoadingSpinnerPane({ isLoading }: LoadingSpinnerPaneProps) {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (isLoading) {
      shownAtRef.current = Date.now();
      setIsVisible(true);
      return;
    }

    if (!isVisible) {
      shownAtRef.current = null;
      return;
    }

    const elapsedMs = shownAtRef.current ? Date.now() - shownAtRef.current : 0;
    const remainingMs = Math.max(0, MIN_SPINNER_VISIBLE_MS - elapsedMs);
    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      shownAtRef.current = null;
      hideTimerRef.current = null;
    }, remainingMs);
  }, [isLoading, isVisible]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <YStack
      position="fixed"
      right={24}
      top={24}
      backgroundColor={theme.paneSecondary}
      borderColor={theme.paneBorderPrimary}
      borderWidth={1}
      borderRadius={12}
      paddingHorizontal={16}
      paddingVertical={12}
      zIndex={110}
      elevation={6}
      pointerEvents="none"
    >
      <Spinner size="small" color={theme.paneTextPrimary?.val} />
    </YStack>
  );
}
