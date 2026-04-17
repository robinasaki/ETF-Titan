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