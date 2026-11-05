# Stats API integration

The app's server proxy calls the unofficial MarvelRivalsAPI service. API keys are held only by the server in `server/.env`.

## Current endpoints used

- `GET /api/v1/player/{uid-or-username}`
- `GET /api/v1/player/{uid-or-username}/match-history`
- `GET /api/v1/heroes`

The service requires an `x-api-key` header. UID lookup is documented as more stable than username lookup. The current mobile adapter maps the documented player response into the app's small `PlayerSummary` model. The match-history route is proxied but the mobile match-history screen still needs to be connected.

## Important data notes

- Profiles can be private or unavailable.
- Player names are not guaranteed to resolve consistently; prefer a UID when possible.
- The upstream API is unofficial and can change without notice.
- Do not assume every profile field is present. Keep UI fallbacks for missing stats.
- Do not expose the API key in the app bundle or any `EXPO_PUBLIC_*` variable.

Reference: https://docs.marvelrivalsapi.com/player-stats-19312751e0
