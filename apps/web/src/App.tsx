import { useEffect, useState } from "react";
import { Text, YStack } from "tamagui";
import { MainHeader } from "./components/MainPage/MainHeader";
import { AppButton } from "./components/Common/AppButton";

export default function App() {
  const [holdings, setHoldings] = useState([]);

  useEffect(() => {
    const loadHoldings = async () => {
      const response = await fetch("/etfs/ETF1/holdings");
      const data = await response.json();
      setHoldings(data.items);
    };
    void loadHoldings();
  }, []);

  return (
    <YStack>
      <MainHeader />
    </YStack>
  );
}
