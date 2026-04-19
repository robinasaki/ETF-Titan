## ETF Titan Web App

This frontend is a single-page React + Vite + Tamagui client for local ETF analytics.
It consumes the backend ETF endpoints, renders analytics panels, and keeps view state in lightweight React hooks.

## Responsibilities

- Render the ETF page shell (`Header`, table header, price series panel, top holdings bar chart, and holdings table)
- Display holdings snapshots with sorting and symbol filtering
- Show reconstructed ETF price history and top holdings distribution
- Handle loading and error states for each panel
- Register global keyboard shortcuts through a centralized shortcut layer

## Assumptions

- Datasets are small enough for client-side sorting and filtering
- No real-time data stream is required
- React local state and hooks are sufficient (no external state manager)
- The app runs in a local/LAN development context
- Mobile-web optimization is out of scope for the take-home baseline

## Frontend Structure
- `web/src/` is the framework root.
- `web/src/components/Common/` stores common, reusable components.
- `web/src/components/MainPage/` contains the components that build the main page table.
- `web/src/hooks/` stores hooks to separate communication logic from UI components.
- `web/src/utils/` contains helper files such as normalizers and formatters.
- `web/src/test/` contains shared test infrastructure, while feature tests live alongside components.
- `web/src/App.tsx` is the main page composition module.
- `web/src/main.tsx` is the framework provider entrypoint module.

## Technical Notes

- Theme tokens and colors are centralized in `packages/shared/src/theme.tamagui.ts`
- Data fetching and transformation logic lives in hooks; UI components stay presentational
- Catalog loading uses `AbortController` cleanup to avoid stale state updates
- Formatter helpers in `src/utils/formatters.ts` are the single source of truth for display formatting
- Table overflow is handled by `ScrollView` wrappers
- Global keyboard shortcuts are registered via `KeyboardShortcutLayer`
- The price-series line color updates from the active brush window trend: green when brush-end price is higher than brush-start price, otherwise red
- The global loading spinner pane uses a small, intentional `100ms` minimum visibility buffer in `src/components/Common/LoadingSpinnerPane.tsx` for smoother UI transitions; this does not indicate actual backend latency

## Keyboard Shortcuts

- `/`: focus the symbol search input
- `Esc`: blur and clear the symbol search input
- `ArrowUp`: select previous ETF in the ETF list
- `ArrowDown`: select next ETF in the ETF list