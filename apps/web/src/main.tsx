import React from "react";
import ReactDOM from "react-dom/client";

import { YStack } from "tamagui";
import { TamaguiProvider } from "tamagui";
import { tamaguiConfig } from "@shared/theme.tamagui";

import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
      <YStack
        paddingHorizontal={24}
        minHeight="100vh"
        backgroundColor="$background"
      >
        <App />
      </YStack>
    </TamaguiProvider>
  </React.StrictMode>,
);
