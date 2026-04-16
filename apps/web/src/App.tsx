import { APP_NAME } from "./constants/app";
import { AppButton } from "./components/Buttons/AppButton";

const sections = [
  "ETF upload",
  "Holdings table",
  "Reconstructed price chart",
  "Top holdings bar chart",
];

export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Take-home scaffold</p>
        <h1>{APP_NAME}</h1>
        <p className="subtitle">
          Minimal React client with a FastAPI plus pandas backend for local ETF analytics.
        </p>
        <AppButton>Example Button</AppButton>
        <AppButton maxWidth={280}>Example Narrow Button</AppButton>
        <AppButton maxWidth={280} tone="danger">
          Review reconstructed holdings
        </AppButton>
      </section>

      <section className="grid">
        {sections.map((section) => (
          <article className="card" key={section}>
            <h2>{section}</h2>
            <p>Placeholder only. No assessment functionality has been implemented yet.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
