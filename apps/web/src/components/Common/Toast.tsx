import { useEffect } from "react";
import { Text, YStack, useTheme } from "tamagui";

type ToastProps = {
  message: string;
  durationMs?: number;
  onDismiss: () => void;
};

const DEFAULT_TOAST_DURATION_MS = 4500;

export function Toast({
  message,
  durationMs = DEFAULT_TOAST_DURATION_MS,
  onDismiss,
}: ToastProps) {
  const theme = useTheme();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss();
    }, durationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [durationMs, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <YStack
      position="fixed"
      right={24}
      bottom={24}
      maxWidth={360}
      backgroundColor={theme.paneSecondary}
      borderColor={theme.paneBorderPrimary}
      borderWidth={1}
      borderRadius={12}
      paddingHorizontal={14}
      paddingVertical={10}
      zIndex={100}
      elevation={6}
    >
      <Text color={theme.paneTextPrimary} fontSize={13} lineHeight={18}>
        {message}
      </Text>
    </YStack>
  );
}
