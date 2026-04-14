import { APP_NAME } from "@etf-titan/shared";

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
          Monorepo foundation with a minimal React client and a planned FastAPI plus pandas backend.
        </p>
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
