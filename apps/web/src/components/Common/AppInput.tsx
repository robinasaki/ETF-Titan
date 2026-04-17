import type { InputProps } from "tamagui";
import { Input, useTheme } from "tamagui";

type AppInputProps = InputProps;

export function AppInput({
  width,
  backgroundColor,
  borderColor,
  color,
  ...rest
}: AppInputProps) {
  const theme = useTheme();

  return (
    <Input
      width={width ?? "100%"}
      backgroundColor={backgroundColor ?? "transparent"}
      borderColor={borderColor ?? theme.paneBorderPrimary}
      color={color ?? theme.paneTextPrimary}
      {...rest}
    />
  );
}
