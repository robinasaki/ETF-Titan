/**
 * A shared button with centralized theme colors.
 *
 * Examples:
 * ```tsx
 * <AppButton>Open ETF dashboard</AppButton>
 * <AppButton tone="danger">Delete watchlist</AppButton>
 * <AppButton maxWidth={280}>Review reconstructed holdings</AppButton>
 * ```
 */
import type { PropsWithChildren } from "react";
import { Button as TamaguiButton, styled } from "tamagui";

type AppButtonTone = "primary" | "danger";

const DEFAULT_BUTTON_MAX_WIDTH = 360;

type AppButtonProps = PropsWithChildren<{
  tone?: AppButtonTone;
  maxWidth?: number | string;
}>;

const AppButtonFrame = styled(TamaguiButton, {
  name: "AppButton",
  maxWidth: DEFAULT_BUTTON_MAX_WIDTH,
  size: "$5",
  borderRadius: 16,
  marginVertical: 16,
  marginHorizontal: 12,
  justifyContent: "center",
  alignItems: "center",
  pressStyle: {
    scale: 0.98,
  },
  variants: {
    tone: {
      primary: {
        backgroundColor: "$buttonPrimaryBackground",
        color: "$buttonPrimaryText",
        hoverStyle: {
          backgroundColor: "$buttonPrimaryHover",
        },
        pressStyle: {
          backgroundColor: "$buttonPrimaryPress",
          scale: 0.98,
        },
      },
      danger: {
        backgroundColor: "$buttonDangerBackground",
        color: "$buttonDangerText",
        hoverStyle: {
          backgroundColor: "$buttonDangerHover",
        },
        pressStyle: {
          backgroundColor: "$buttonDangerPress",
          scale: 0.98,
        },
      },
    },
  } as const,
  defaultVariants: {
    tone: "primary",
  },
});

export function AppButton({
  children,
  tone = "primary",
  maxWidth = DEFAULT_BUTTON_MAX_WIDTH,
}: AppButtonProps) {
  return (
    <AppButtonFrame tone={tone} maxWidth={maxWidth}>
      {children}
    </AppButtonFrame>
  );
}
