import {
  type ComponentRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  forwardRef,
} from "react";
import type { InputProps } from "tamagui";
import { Input, useTheme } from "tamagui";

type AppInputProps = InputProps;
export type AppInputRef = ComponentRef<typeof Input>;

type AppInputComponent = ForwardRefExoticComponent<
  AppInputProps & RefAttributes<AppInputRef>
>;

export const AppInput: AppInputComponent = forwardRef<AppInputRef, AppInputProps>(
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

    // In theory we have to apply the foamtter to textTransform to ensure consistency.
    return (
      <Input
        ref={ref}
        width={width ?? "100%"}
        backgroundColor={backgroundColor ?? "transparent"}
        borderColor={borderColor ?? theme.paneBorderPrimary}
        color={color ?? theme.paneTextPrimary}
        textTransform="uppercase"
        {...rest}
      />
    );
  }
);
