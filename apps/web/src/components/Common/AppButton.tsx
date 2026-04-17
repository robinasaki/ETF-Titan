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
import { Button as TamaguiButton, Text, XStack, styled, useTheme } from "tamagui";

type AppButtonTone = "primary" | "danger";

/**
 * Put the button usage here
 */
type AppButtonEmoji = "plus";

import {
  IconPlus,
} from "@tabler/icons-react";

const buttonEmojiIcons = {
  plus: IconPlus
} as const;

const DEFAULT_BUTTON_MAX_WIDTH = 360;
const BUTTON_ICON_SIZE = 18;
const BUTTON_LABEL_FONT_SIZE = 16;

type AppButtonProps = PropsWithChildren<{
  tone?: AppButtonTone;
  icon?: AppButtonEmoji;
  maxWidth?: number | string;
}>;

const AppButtonFrame = styled(TamaguiButton, {
  name: "AppButton",
  maxWidth: DEFAULT_BUTTON_MAX_WIDTH,
  borderRadius: 16,
  marginVertical: 16,
  marginHorizontal: 12,
  justifyContent: "center",
  alignItems: "center",
  pressStyle: {
    scale: 0.96,
  },
});

export function AppButton({
  children,
  tone = "primary",
  icon,
  maxWidth = DEFAULT_BUTTON_MAX_WIDTH,
}: AppButtonProps) {
  const theme = useTheme();
  const isDanger = tone === "danger";
  const Icon = icon ? buttonEmojiIcons[icon] : null;

  return (
    <AppButtonFrame
      maxWidth={maxWidth}
      backgroundColor={isDanger ? theme.red10 : theme.panePrimary}
      hoverStyle={{
        backgroundColor: isDanger ? theme.red9 : theme.paneHover,
      }}
      pressStyle={{
        backgroundColor: isDanger ? theme.red8 : theme.paneHover,
        scale: 0.98,
      }}
    >
      <XStack alignItems="center" justifyContent="center" flexWrap="nowrap">
        {Icon ? (
          <Icon
            color={theme.paneTextPrimary?.val}
            size={BUTTON_ICON_SIZE}
            stroke={1.8}
            style={{
              marginRight: 6,
              position: "relative",
              top: 2,
              flexShrink: 0,
            }}
          />
        ) : null}

        <Text
          color={theme.paneTextPrimary}
          fontSize={BUTTON_LABEL_FONT_SIZE}
          lineHeight={BUTTON_LABEL_FONT_SIZE}
          flexShrink={0}
        >
          {children}
        </Text>
      </XStack>
    </AppButtonFrame>
  );
}
