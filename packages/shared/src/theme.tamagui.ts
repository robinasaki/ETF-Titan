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

const lightThemeTokens = {
  trueRed: brandColors.trueRed,
  lochmara: brandColors.lochmara,
  background: "#FFFFFF",
  color: "#101828",
} as const;

/**
 * I stole all these from Wealthsimple.
 */
const darkThemeTokens = {
  background: "#2A2C32",
  textPrimary: "#FFFFFF",
} as const;

export const tamaguiConfig: TamaguiInternalConfig = createTamagui({
  ...defaultConfig,
  fonts: appFonts,
  tokens: {
    ...defaultConfig.tokens,
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      ...lightThemeTokens,
    },
    dark: {
      ...defaultConfig.themes.dark,
      ...darkThemeTokens,
    },
  },
});

export type AppTamaguiConfig = typeof tamaguiConfig;