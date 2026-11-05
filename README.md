# Rivals Intel

A mobile companion for Marvel Rivals: player profiles, career statistics, match history, hero breakdowns, and (where supported) a live match companion.

> **Status: early development.** The mobile app currently starts with a demo dashboard. Live PC match data requires a separate desktop companion. Console live telemetry is not currently implemented.

## Project direction

- **Mobile:** Expo + React Native + TypeScript.
- **Stats provider:** [MarvelRivalsAPI](https://docs.marvelrivalsapi.com/) for player profiles, hero data, and match history. This is an unofficial API and may change.
- **Live PC companion:** a future Overwolf desktop app using the [Marvel Rivals Game Events Provider](https://dev.overwolf.com/ow-electron/live-game-data-gep/supported-games/marvel-rivals/).
- **Backend:** a small Node.js API proxy keeps the MarvelRivalsAPI key off the mobile device.

## Important live-data limitation

A phone app cannot independently inspect a game running on a separate PlayStation or PC. The Overwolf integration is a **Windows/PC desktop companion** that can receive supported game events and relay permitted match information to the phone. There is no console live-data integration in this starter.

Overwolf's Marvel Rivals integration documents roster values including kills, deaths, assists, hero, map and match type, as well as match lifecycle events. NetEase/Overwolf compliance rules restrict unfair-advantage features and confidential information. Rivals Intel will not expose restricted damage/healing information, ability predictions, cooldowns, or other prohibited data. Any live feature must be reviewed against current game terms and Overwolf policies before release.

## Repository layout

```text
rivals-intel/
├── app/                 # Expo Router screens
├── src/
│   ├── components/      # Reusable UI
│   ├── services/        # API client and demo data
│   └── theme/           # Design tokens
├── server/              # Optional API-key proxy
├── docs/                # Integration notes
├── app.json
├── package.json
└── tsconfig.json
```

## Run the mobile app

Requirements: Node.js LTS and npm.

```bash
npm install
npx expo start
```

Use Expo Go to scan the QR code, or press `w` to run the web preview. The dashboard uses sample data until a backend URL is configured.

## Run the API proxy

The proxy is optional for the demo UI. It protects your API key by keeping it on the server.

```bash
cd server
npm install
cp .env.example .env
# Add your MarvelRivalsAPI key to server/.env
npm run dev
```

Then set `EXPO_PUBLIC_API_BASE_URL` to the proxy's reachable URL before starting Expo. For a phone, use your computer's LAN IP rather than `localhost`.

Never put API keys in `EXPO_PUBLIC_*` variables or commit secrets.

## Current API routes

- `GET /health`
- `GET /api/player/:query`
- `GET /api/player/:query/match-history`
- `GET /api/heroes`

The upstream API requires an `x-api-key` header. Check its current documentation for parameters, limits, and response formats.

## Multi-platform direction

Rivals Intel is planned as one ecosystem across iPhone, iPad, Dynamic Island, Google TV, Mac and Windows. The existing Expo + React Native app remains the starting point for iPhone and iPad; native platform integrations will be added only where required. See [docs/platform-architecture.md](docs/platform-architecture.md) for the shared architecture, platform responsibilities and phased delivery plan.

## Roadmap

- [x] Initial mobile app shell and dark dashboard
- [x] Demo player profile and sample match history
- [x] Server-side API-key proxy foundation
- [x] Multi-platform architecture and phased delivery plan
- [ ] Install, typecheck and run the existing app
- [ ] Connect and validate a real player profile
- [ ] Connect and normalise live player match history
- [ ] Hero statistics and filters
- [ ] Responsive iPhone and iPad layouts
- [ ] Desktop-width web dashboard, then evaluate Mac packaging
- [ ] Overwolf Windows companion prototype, subject to current policy review
- [ ] Secure live-session pairing between desktop and mobile
- [ ] iOS Live Activity / Dynamic Island prototype using permitted data only
- [ ] Google TV remote-first proof of concept
- [ ] Console-friendly post-match workflow, if a supported data source exists

## Disclaimer

Rivals Intel is an independent fan project and is not affiliated with, endorsed by, or sponsored by Marvel, NetEase, or Overwolf. Marvel Rivals names and marks belong to their respective owners. Use third-party APIs and game integrations in accordance with their terms.
