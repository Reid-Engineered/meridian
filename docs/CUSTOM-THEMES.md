# Custom appearance themes

Settings offers Strawberry, Mocha and Ube alongside Light, Dark and Automatic. Explicit custom preferences persist across launches and do not follow OS theme changes. Strawberry and Ube use a light color scheme; Mocha uses a dark color scheme and the official logo's light-on-dark wordmark. The Windows caption uses the same theme tokens as the app and retains the native controls from PR #4.

Theme controls wrap within their card at narrow widths. Existing library, icon sources and storage behavior are unchanged. The theme preference resolves to a known palette rather than an unrestricted string. Tests cover restoring, applying and persisting all three custom themes and selecting them from Settings.

October 9 integration verification: `npm run verify -- --quick` passed all 38 frontend tests, 27 Rust tests, the production frontend build, and four isolated catalog fixtures. The Windows control tests remain included. This theme-only increment did not rebuild the desktop installers or repeat the installed native smoke run; the existing recovery installer predates these themes.
