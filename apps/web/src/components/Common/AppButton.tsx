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
import {
  type ComponentProps,
  type ComponentType,
  type PropsWithChildren,
} from "react";
import type { IconProps } from "@tabler/icons-react";
import { Button as TamaguiButton, Text, XStack, styled, useTheme } from "tamagui";

type AppButtonTone = "primary" | "danger" | "ghost";
type AppButtonIcon = ComponentType<IconProps>;
type AppButtonCursor = "pointer" | "not-allowed";
type AppButtonStyleProps = Omit<
  Partial<ComponentProps<typeof TamaguiButton>>,
  | "children"
  | "tone"
  | "icon"
  | "maxWidth"
  | "onPress"
  | "aria-label"
  | "disabled"
  | "cursor"
  | "hoverStyle"
  | "pressStyle"
>;

const DEFAULT_BUTTON_MAX_WIDTH = 360;
const BUTTON_ICON_SIZE = 18;
const BUTTON_LABEL_FONT_SIZE = 16;

type AppButtonProps = PropsWithChildren<
  {
    tone?: AppButtonTone;
    icon?: AppButtonIcon;
    maxWidth?: number | string;
    onPress?: () => void;
    ariaLabel?: string;
    disabled?: boolean;
    cursor?: AppButtonCursor;
  } & AppButtonStyleProps
>;

const AppButtonFrame = styled(TamaguiButton, {
  name: "AppButton",
  borderRadius: 16,
  minHeight: 40,
  paddingHorizontal: 12,
  paddingVertical: 8,
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
  onPress,
  ariaLabel,
  disabled = false,
  cursor,
  ...styles
}: AppButtonProps) {
  const theme = useTheme();
  const isDanger = tone === "danger";
  const isGhost = tone === "ghost";
  const defaultBackground = isDanger
    ? theme.red10
    : isGhost
      ? "transparent"
      : theme.panePrimary;
  const hoverBackground = isDanger ? theme.red9 : isGhost ? theme.paneSecondary : theme.paneHover;
  const pressBackground = isDanger ? theme.red8 : isGhost ? theme.paneSecondary : theme.paneHover;
  const Icon = icon;
  const hasTextLabel = typeof children === "string" || typeof children === "number";
  const hasChildren = children !== null && children !== undefined && typeof children !== "boolean";
  const contentGap = Icon && hasChildren ? 6 : 0;

  return (
    <AppButtonFrame
      maxWidth={maxWidth}
      onPress={onPress}
      disabled={disabled}
      backgroundColor={defaultBackground}
      borderWidth={0}
      opacity={disabled ? 0.5 : 1}
      cursor={disabled ? "not-allowed" : cursor}
      aria-label={ariaLabel}
      {...styles}
      hoverStyle={{
        backgroundColor: hoverBackground,
        opacity: disabled ? 0.5 : isGhost ? 0.9 : 1,
      }}
      pressStyle={{
        backgroundColor: pressBackground,
        opacity: disabled ? 0.5 : isGhost ? 0.75 : 1,
        scale: 0.98,
      }}
    >
      <XStack
        width="100%"
        alignItems="center"
        justifyContent="center"
        flexDirection="row"
        flexWrap="nowrap"
        gap={contentGap}
      >
        {Icon ? (
          <Icon
            color={theme.paneTextPrimary?.val}
            size={BUTTON_ICON_SIZE}
            stroke={1.8}
            style={{
              display: "block",
              flexShrink: 0,
            }}
          />
        ) : null}

        {hasTextLabel ? (
          <Text
            color={theme.paneTextPrimary}
            fontSize={BUTTON_LABEL_FONT_SIZE}
            lineHeight={BUTTON_LABEL_FONT_SIZE}
            whiteSpace="nowrap"
            numberOfLines={1}
            flexShrink={0}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </XStack>
    </AppButtonFrame>
  );
}
