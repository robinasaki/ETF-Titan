### Assumptions:
- No large datasets, thus no frontend & hook virtualization logics.
- No real-time updates. Thus no trasisent states such as Zustand (or debounced states) used here.
- No large datasets, thus symbol sorting and filtering are done client-side.

### Technical Considerations
- All the colour tokens are centralized in Tamagui config.
- All the component attributes are even numbered.
- Data operations is isolated in hooks. Components don't do API logics.
- Catalog request uses `AbortController` cleanup to avoid stale state updates after unmount.
- Memotization on hook returns.
- Scrollview to prevent overflow on ETFTable.
- Use only Tamagui components. Register UI definitions through only the Tamagui props, unless injecting to React styles is absolutely necessary. Use only Tamagui animation props tokens since we're centralizing the UI and colour.
- For dynamic text strings, construct the string outside the component.
- Although for this project, the frontend and the backend are probably connected through localhost (or LAN), I implemented the loading stage for frontend anyway since it is a good practice.
- We assume the web is used normally. This project is not yet optimized for small web and mobile web display.
- Frontend formatting functions, such as price formatters are defined in `utils/` to ensure display consistency. This is the single source-of-truth for price rounding.