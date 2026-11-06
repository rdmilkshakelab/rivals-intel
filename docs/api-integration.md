# Stats provider integration

Rivals Intel uses a provider adapter in `server/stats-provider.js`. The selected source is controlled by `STATS_PROVIDER`, so the frontend and app data model do not need to change when providers are switched.

## Current temporary provider

`STATS_PROVIDER=mrivals` is the current setting. The server uses [mrivals](https://github.com/iFraan/mrivals) to retrieve public Tracker Network profile information, lifetime overview, hero analytics, role analytics and peak rank. It does not require an official MarvelRivalsAPI key.

The server caches profile responses in memory for five minutes by default (`STATS_CACHE_SECONDS`) and rate-limits profile lookups. Optional fetching settings are `MRIVALS_FLARESOLVERR_URL` and `MRIVALS_USE_CURL=true`.

## Switching back to MarvelRivalsAPI

When MarvelRivalsAPI is available again:

1. Set `STATS_PROVIDER=marvelrivalsapi` in the API host environment.
2. Restore the server-only `MARVEL_RIVALS_API_KEY` secret.
3. Restart/redeploy the API.

No frontend code or saved player data needs to be migrated. The adapter supports both provider response shapes.

## Current feature differences

| Feature | mrivals | MarvelRivalsAPI |
|---|---|---|
| Player profile and MMR | Yes | Yes |
| Lifetime overview | Yes | Yes |
| Hero analytics | Yes | Yes |
| Role analytics | Yes | Provider response |
| Peak rank | Yes | Provider response |
| Match history | Not exposed by the library | Supported endpoint |
| Global hero catalogue | Not exposed by the library | Supported endpoint |

While mrivals is active, match-history and global hero-catalogue endpoints return HTTP 501 rather than fake or sample results.

## Reliability, licensing and responsible use

mrivals is a community-maintained scraper/wrapper for public Tracker Network endpoints, not an official Tracker Network API. Public endpoints can change, throttle requests or become unavailable. Use caching and avoid frequent polling.

The mrivals repository currently declares GPL-3.0. Its README says production/commercial users should contact TRNetwork. Review the licence and Tracker Network terms before public or commercial distribution.

References: https://github.com/iFraan/mrivals and https://docs.marvelrivalsapi.com/
