## ETF Titan Web App

This frontend is a single-page React + Vite + Tamagui client for local ETF analytics.
It consumes the backend ETF endpoints, renders analytics panels, and keeps view state in lightweight React hooks.

## Responsibilities

- Render the ETF page shell (`Header`, table header, price series panel, top holdings pie chart, and holdings table)
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
- `web/src/components/Commmon/` stores common, reuseable components.
- `web/src/components/MainPage/` contains the components that builds up to the actual page table.
- `web/src/hooks/` stores all the hook components to separate communication logics and components. 
- `web/src/utils/` contains all the helper files such as normalizers and formatters.
- `web/src/test/` contains the test infra. Then the feature tests are alongside the actual components.
- `web/App.tsx/` is the component building module.
- `web/main.tsx/` is the framework provider building module.

## Technical Notes

- Theme tokens and colors are centralized in `packages/shared/src/theme.tamagui.ts`
- Data fetching and transformation logic lives in hooks; UI components stay presentational
- Catalog loading uses `AbortController` cleanup to avoid stale state updates
- Formatter helpers in `src/utils/formatters.ts` are the single source of truth for display formatting
- Table overflow is handled by `ScrollView` wrappers
- Global keyboard shortcuts are registered via `KeyboardShortcutLayer`

## Keyboard Shortcuts

- `/`: focus the symbol search input
- `Esc`: blur and clear the symbol search input
- `ArrowUp`: select previous ETF in the ETF list
- `ArrowDown`: select next ETF in the ETF list