import { defaultConfig } from "@tamagui/config/v4";
import { createTamagui } from "tamagui";
import type { TamaguiInternalConfig } from "tamagui";

export const tamaguiConfig: TamaguiInternalConfig = createTamagui(defaultConfig);

export type AppTamaguiConfig = typeof tamaguiConfig;
