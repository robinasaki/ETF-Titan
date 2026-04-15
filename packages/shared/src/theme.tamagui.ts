import { defaultConfig } from "@tamagui/config/v4";
import { createTamagui } from "tamagui";
import type { TamaguiInternalConfig } from "tamagui";

const brandColors = {
  trueRed: "#ED3124",
  lochmara: "#0078C1",
} as const;

const lightThemeTokens = {
  trueRed: brandColors.trueRed,
  lochmara: brandColors.lochmara,
  surface: "#FFFFFF",
  surfaceAlt: "#F7F9FC",
  borderSubtle: "#D7DFEA",
  textPrimary: "#101828",
  textMuted: "#475467",
  buttonPrimaryBackground: brandColors.lochmara,
  buttonPrimaryHover: "#006BAA",
  buttonPrimaryPress: "#00588E",
  buttonPrimaryText: "#FFFFFF",
  buttonDangerBackground: brandColors.trueRed,
  buttonDangerHover: "#D92D20",
  buttonDangerPress: "#B42318",
  buttonDangerText: "#FFFFFF",
} as const;

const darkThemeTokens = {
  trueRed: brandColors.trueRed,
  lochmara: brandColors.lochmara,
  surface: "#101828",
  surfaceAlt: "#182230",
  borderSubtle: "#344054",
  textPrimary: "#F8FAFC",
  textMuted: "#CBD5E1",
  buttonPrimaryBackground: "#1390DB",
  buttonPrimaryHover: "#33A1E4",
  buttonPrimaryPress: "#0078C1",
  buttonPrimaryText: "#F8FAFC",
  buttonDangerBackground: "#F04438",
  buttonDangerHover: "#F97066",
  buttonDangerPress: "#D92D20",
  buttonDangerText: "#FFF7F7",
} as const;

export const tamaguiConfig: TamaguiInternalConfig = createTamagui({
  ...defaultConfig,
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