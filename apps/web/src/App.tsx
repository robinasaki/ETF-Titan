import { APP_NAME } from "./constants/app";
import { AppButton } from "./components/Buttons/AppButton";
import { useEffect, useState } from "react";

const sections = [
  "ETF upload",
  "Holdings table",
  "Reconstructed price chart",
  "Top holdings bar chart",
];

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
    <main className="app-shell">
      <section className="grid">
        {holdings.map((holding, idx) => (
          <p key={idx}>{JSON.stringify(holding)}</p>
        ))}
      </section>
    </main>
  );
}
