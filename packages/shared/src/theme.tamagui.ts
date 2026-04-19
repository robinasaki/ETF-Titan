import { defaultConfig } from "@tamagui/config/v4";
import { createTamagui } from "tamagui";
import type { TamaguiInternalConfig } from "tamagui";

const brandColors = {
  trueRed: "#ED3124",
  lochmara: "#0078C1",
} as const;

const appFontFamily = 'Avenir Next';
const appFonts = {
  ...defaultConfig.fonts,
  body: {
    ...defaultConfig.fonts.body,
    family: appFontFamily,
  },
} as const;

/**
 * I stole all these from Wealthsimple.
 */
const darkThemeTokens = {
  background: "rgb(30, 30, 30)",
  textPrimary: "rgb(255, 255, 255)",
  textPaneSecondary: "rgb(180, 180, 180)",
  textMuted: "rgb(140, 140, 140)",

  textReversePrimary: "rgb(30, 30, 30)",

  panePrimary: "rgb(102, 102, 102)",
  paneSecondary: "rgb(60, 60, 60)",
  paneHover: "rgb(140, 140, 140)",
  paneBorderPrimary: "rgb(135, 135, 135)",
  paneTextPrimary: "rgb(200, 200, 200)",

  brushInBound: "rgb(300, 300, 300)",
  brushOutBound: "rgb(50, 50, 50)",

  timeSeriesRed: "#d50000",
  timeSeriesGreen: "#00c853",
} as const;

export const tamaguiConfig: TamaguiInternalConfig = createTamagui({
  ...defaultConfig,
  fonts: appFonts,
  tokens: {
    ...defaultConfig.tokens,
  },
  themes: {
    dark: {
      ...defaultConfig.themes.dark,
      ...darkThemeTokens,
    },
  },
});

export type AppTamaguiConfig = typeof tamaguiConfig;