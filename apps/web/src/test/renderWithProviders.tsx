import { ReactNode } from "react";
import { render } from "@testing-library/react";
import { TamaguiProvider } from "tamagui";
import { tamaguiConfig } from "@shared/theme.tamagui";

export function renderWithProviders(node: ReactNode): ReturnType<typeof render> {
  return render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
      {node}
    </TamaguiProvider>
  );
}
