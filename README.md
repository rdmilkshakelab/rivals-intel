# Rivals Intel

A multi-platform Marvel Rivals companion for player profiles, career statistics, match history, hero breakdowns and (where supported) a live match companion.

> **Status: early development.** The dashboard still includes sample player and match data. Accounts and device pairing now have a backend foundation, but require a configured PostgreSQL database and production security work before public launch.

## Project direction

- **Mobile and web:** Expo + React Native + TypeScript, with a responsive web build.
- **Accounts:** shared Express API with PostgreSQL-backed users and sessions.
- **Security:** scrypt password hashing, optional TOTP authenticator apps, recovery codes and device session management.
- **Device pairing:** short-lived QR/device-code flow for TV and other shared-screen devices.
- **Stats provider:** [MarvelRivalsAPI](https://docs.marvelrivalsapi.com/) for player profiles, hero data and match history. This is an unofficial API and may change.
- **Live PC companion:** future Overwolf desktop app using the [Marvel Rivals Game Events Provider](https://dev.overwolf.com/ow-electron/live-game-data-gep/supported-games/marvel-rivals/).

## Important live-data limitation

A phone app cannot independently inspect a game running on a separate PlayStation or PC. The Overwolf integration is a Windows/PC desktop companion that can receive supported game events and relay permitted match information to the phone. Console live telemetry is not implemented.

Overwolf's Marvel Rivals integration documents roster values including kills, deaths, assists, hero, map and match type, as well as match lifecycle events. NetEase/Overwolf compliance rules restrict unfair-advantage features and confidential information. Rivals Intel will not expose restricted damage/healing information, ability predictions, cooldowns or other prohibited data. Any live feature must be reviewed against current game terms and Overwolf policies before release.

## Run the mobile/web app

Requirements: Node.js LTS and npm.

~~~bash
npm install
npx expo start
~~~

Use Expo Go to scan the QR code, or press w to run the web preview. The dashboard uses sample data until a backend URL is configured.

## Run the API

~~~bash
cd server
npm install
cp .env.example .env
# Configure the values described in server/.env.example
npm run dev
~~~

Accounts require a persistent PostgreSQL database. Set DATABASE_URL, DATABASE_SSL, AUTH_ENCRYPTION_KEY, ALLOWED_ORIGIN and PUBLIC_WEB_URL in server/.env. Generate the encryption key with openssl rand -base64 32. Keep it private. Set the root .env value EXPO_PUBLIC_API_BASE_URL to the API's reachable origin. On a physical phone, use a reachable LAN/Codespaces URL rather than localhost.

Never put API keys, database credentials or encryption keys in EXPO_PUBLIC variables or commit .env files.

## Account features

- Register and sign in with email, username and password.
- Optional Google Authenticator-compatible TOTP setup with QR code.
- One-time recovery codes.
- View active devices and revoke individual sessions.
- Sign out of all other devices.
- TV/device QR pairing and short activation codes, including an in-app camera scanner.

See [docs/accounts-and-device-auth.md](docs/accounts-and-device-auth.md) for configuration, endpoints, security notes and the device-pairing sequence. Email verification, password-reset delivery and new-device alerts still need an email/notification provider and must be completed before public registration is enabled.

## Current API routes

- GET /health
- GET /api/player/:query
- GET /api/player/:query/match-history
- GET /api/heroes
- Account and device routes documented in docs/accounts-and-device-auth.md.

The upstream stats API requires an x-api-key header. Check its current documentation for parameters, limits and response formats.

## Multi-platform direction

Rivals Intel is planned as one ecosystem across iPhone, iPad, Dynamic Island, Google TV, Mac and Windows. See docs/platform-architecture.md for shared architecture, platform responsibilities and phased delivery.

## Roadmap

- [x] Initial mobile dashboard and demo data
- [x] Server-side stats API-key proxy foundation
- [x] Multi-platform architecture plan
- [x] Account API and PostgreSQL schema bootstrap
- [x] TOTP authenticator setup and recovery-code backend
- [x] Device sessions, remote revocation and sign-out-others
- [x] QR and short-code device pairing backend
- [x] Account, device, activation and mobile QR-scanner screens
- [x] GitHub Actions installs dependencies, passes the app TypeScript typecheck and checks server JavaScript syntax
- [ ] Run Expo web/native builds and verify the app in Codespaces and on a phone
- [ ] Configure and test a persistent PostgreSQL instance
- [ ] Add email verification and password reset
- [x] Device renaming
- [ ] Add new-device alerts
- [ ] Complete production security review and deployment
- [ ] Validate real player profiles and match history
- [ ] Responsive desktop web dashboard
- [ ] Overwolf Windows companion prototype, subject to current policy review
- [ ] iOS Live Activity / Dynamic Island prototype using permitted data only
- [ ] Google TV remote-first app build

## Disclaimer

Rivals Intel is an independent fan project and is not affiliated with, endorsed by or sponsored by Marvel, NetEase or Overwolf. Marvel Rivals names and marks belong to their respective owners. Use third-party APIs and game integrations in accordance with their terms.
