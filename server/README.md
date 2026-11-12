# Rivals Intel API

The Rivals Intel API is the shared backend for the Rivals Intel web, mobile and desktop clients.

## Run locally

Requirements: Node.js LTS and npm.

~~~bash
cd server
npm install
cp .env.example .env
# Configure the values described in .env.example
npm run dev
~~~

The API listens on port 4000 by default. Set `PORT` to override it.

## API documentation

When the server is running:

- `GET /` — service information and endpoint index.
- `GET /health` — health status, active stats provider and account-database configuration.
- `GET /openapi.json` — OpenAPI 3.1 specification.

## Public statistics endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/player/{username}` | Public player profile, overview, hero and role analytics, peak rank |
| GET | `/api/player/{username}/match-history` | Match history when supported by the selected provider |
| GET | `/api/heroes` | Hero catalogue when supported by the selected provider |

Player usernames must be 2-32 characters and may contain letters, numbers, spaces, underscores, dots and hyphens. Player-data routes are rate-limited. Match-history pagination accepts `page` (minimum 1) and `limit` (1-50).

### Example requests

~~~bash
curl https://rivals-intel-api.onrender.com/
curl https://rivals-intel-api.onrender.com/health
curl https://rivals-intel-api.onrender.com/openapi.json
curl https://rivals-intel-api.onrender.com/api/player/PLAYER_USERNAME
curl "https://rivals-intel-api.onrender.com/api/player/PLAYER_USERNAME/match-history?page=1&limit=20"
curl https://rivals-intel-api.onrender.com/api/heroes
~~~

A provider may return HTTP 501 when a feature is not available. The API deliberately does not fabricate match history or hero catalogue data.

## Configuration

See [`.env.example`](.env.example). Important settings:

- `STATS_PROVIDER` — `mrivals` or `marvelrivalsapi`.
- `STATS_CACHE_SECONDS` — profile cache lifetime; defaults to 300 seconds.
- `ALLOWED_ORIGIN` — comma-separated exact client origins.
- `DATABASE_URL` — persistent PostgreSQL connection for accounts and device pairing.
- `DATABASE_SSL` — set to `true` when the database host requires TLS.
- `AUTH_ENCRYPTION_KEY` — base64-encoded 32-byte key for encrypted authenticator secrets.
- `PUBLIC_WEB_URL` — public web origin used for device activation.
- `PUBLIC_REGISTRATION_ENABLED` — keep `false` until email verification and password recovery are implemented.
- `PUBLIC_API_URL` — public API origin used in the OpenAPI document.

Never commit `.env`, database credentials, API keys or encryption keys. Never expose secrets through `EXPO_PUBLIC_*` variables.

## Data-source limitations

The current `mrivals` adapter reads public Tracker Network profile data through a community-maintained wrapper. It is not an official Tracker Network API. Match history and the global hero catalogue are not exposed by that adapter and return HTTP 501. Review the wrapper's GPL-3.0 licence and Tracker Network terms before commercial or public distribution. See [the provider integration notes](../docs/api-integration.md).

## Account endpoints

Registration, login, authenticator setup, device sessions and QR pairing are also provided by this server. These require a persistent PostgreSQL database and production security work. Email verification and password-reset delivery are not yet configured, so public registration should remain disabled until those are completed.

## Deployment

The API is intended to run as a Node.js web service (for example, on Render) with:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Health-check path: `/health`

Configure environment variables in the hosting dashboard. Do not put secrets in GitHub Actions logs or repository files.
