# Meridian v0.1.4 — Settings and appearance

- Organizes Settings into Appearance, Library data, Backup & restore, and About tabs, with keyboard navigation.
- Adds persistent sidebar logo choices: left or centered placement, and symbol with name or symbol only, including Meridian 95.
- Sets the light and dark Meridian wordmarks in outlined Palatino Linotype.
- Fixes unreadable native dropdown options in dark themes while preserving native keyboard selection.

Includes all v0.1.3 features and fixes. No database migration is required. Existing libraries and portable backups remain supported.

Reviewed and merged PRs [#10](https://github.com/Reid-Engineered/meridian/pull/10), [#11](https://github.com/Reid-Engineered/meridian/pull/11), and [#12](https://github.com/Reid-Engineered/meridian/pull/12). Combined verification passed 77 frontend tests, 32 Rust tests, the production frontend build, and isolated database fixtures through 10,000 books. Platform downloads include build verification reports, provenance, and SHA-256 checksums.

Windows packages are unsigned. macOS packages use ad-hoc signing and are not notarized. Installed-app upgrade, screen-reader, and native macOS/Linux appearance acceptance remain manual checks.
