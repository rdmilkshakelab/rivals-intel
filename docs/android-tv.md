# Rivals Intel Android TV

The TV client is a separate native Android application in `apps/tv`. It declares the Android TV Leanback launcher category and does not require a touchscreen. Its first screen is designed for a 10-foot display and presents the device-code/QR pairing flow.

## Configure the API

Before building a connected TV release, replace the placeholder `API_BASE_URL` in `apps/tv/app/build.gradle.kts` with the HTTPS origin of the deployed Rivals Intel API. The TV client calls:

- `POST /api/device/authorise` to create a short-lived pairing request.
- `POST /api/device/poll` to wait for approval from the mobile/web account screen.

The mobile app's account screen includes the QR scanner and the web activation screen accepts the short code. The TV client stores the returned session token locally after pairing. Treat the TV as a shared device and add a sign-out/device-revocation screen before public release.

## Build

The GitHub Actions workflow `.github/workflows/android-build.yml` builds two artifacts: the Expo Android APK and the native Android TV APK. Run it from Actions → Build Rivals Intel Android apps → Run workflow, or push changes to the main branch.

The TV app is an initial pairing/dashboard shell. Player stats and match history are not yet rendered in the TV UI.
