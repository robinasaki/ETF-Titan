import { useEffect, useState } from "react";
import { Text, YStack } from "tamagui";
import { MainHeader } from "./components/MainPage/MainHeader";
import { ETFTable } from "./components/MainPage/ETFTable";

export default function App() {
  return (
    <YStack>
      <MainHeader />

      <ETFTable />
    </YStack>
  );
}
