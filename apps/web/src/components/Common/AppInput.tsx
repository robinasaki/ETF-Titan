import {
  type ForwardRefExoticComponent,
  type RefAttributes,
  forwardRef,
} from "react";
import type { InputProps } from "tamagui";
import { Input, useTheme } from "tamagui";

type AppInputProps = InputProps;

type AppInputComponent = ForwardRefExoticComponent<
  AppInputProps & RefAttributes<any>
>;

export const AppInput: AppInputComponent = forwardRef<any, AppInputProps>(
  function AppInput(
    {
      width,
      backgroundColor,
      borderColor,
      color,
      ...rest
    }: AppInputProps,
    ref
  ) {
    const theme = useTheme();

    return (
      <Input
        ref={ref}
        width={width ?? "100%"}
        backgroundColor={backgroundColor ?? "transparent"}
        borderColor={borderColor ?? theme.paneBorderPrimary}
        color={color ?? theme.paneTextPrimary}
        {...rest}
      />
    );
  }
);
