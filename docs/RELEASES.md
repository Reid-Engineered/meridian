# Release packages

The manually dispatched **Linux and macOS release packages** workflow builds an existing `v`-prefixed release tag, checks that it matches the application version, runs full `npm run verify` on each platform, and attaches packages only after that platform passes. It does not move the tag or create a new release.

Linux x64 builds on Ubuntu 22.04 and produces Debian, RPM and AppImage packages. macOS builds separately on Apple Silicon and Intel runners and produces DMG installers and compressed application bundles. Each platform includes a verification report, exact source commit, GitHub Actions run URL and SHA-256 hashes.

macOS packages use ad-hoc signing with an 11.0 deployment target. They are not signed with an Apple Developer ID or notarized, so downloaded packages may require approval in macOS Privacy & Security. The workflow verifies the app's code signature; it does not qualify installation, upgrades, interactive cover navigation or system-picker behavior. Those remain manual acceptance checks on each platform.

Run the workflow from GitHub Actions, supplying the existing release tag (for example `v0.1.0`). Re-running it replaces only the named Linux/macOS assets for that version. Windows packages are built and verified separately.
