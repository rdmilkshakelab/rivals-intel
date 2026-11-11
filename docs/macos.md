# Rivals Intel for macOS

The macOS desktop shell is an Electron wrapper around the hosted Rivals Intel web application. It uses the existing web dashboard and API; it does not fork the player-data or statistics logic.

## Local build

```bash
cd apps/macos
npm install
npm start
npm run dist
```

The package script creates universal Apple Silicon and Intel DMG/ZIP artifacts on macOS.

## Automated build

Run **Build Rivals Intel macOS** from GitHub Actions, or push changes to `apps/macos/**`. Download the `rivals-intel-macos` workflow artifact.

## Current limitations

- The shell loads the hosted web application and therefore requires an internet connection.
- The app is not code-signed or notarized. macOS may warn when opening downloaded builds. Distribution outside development requires an Apple Developer ID signing certificate and notarization configuration.
- The desktop shell is a first release wrapper, not a native Swift application.
