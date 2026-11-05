# Live companion architecture

## What is feasible

The Overwolf Marvel Rivals Game Events Provider (GEP) documents live match information including match ID, game type, map, roster entries, and match lifecycle / kill / death / assist events. Roster data includes player identity, hero, team, K/D/A, alive state, and local-player flag.

This is a **Windows desktop integration**, not a mobile SDK. The intended architecture is:

1. A Windows Overwolf companion receives supported GEP events.
2. It filters and validates permitted match information.
3. It pairs with Rivals Intel using a short-lived one-time code.
4. It sends a minimal, authenticated live-session payload to the backend.
5. The mobile app subscribes to that session over an authenticated realtime channel.

## Compliance first

Overwolf's Marvel Rivals page explains that NetEase's compliance policy prohibits features that provide unfair competitive advantages and specifically identifies confidential damage/healing information and ability/ultimate predictions as restricted. Its policy also requires compliance with the game's terms.

Therefore this project will not implement:
- Damage or healing overlays / statistics from restricted live telemetry.
- Enemy ultimate prediction or ability cooldown prediction.
- Hidden information, wallhacks, enemy location inference, or gameplay automation.
- Features intended to influence competitive decisions using prohibited data.

Before any public release, re-check the current Overwolf game events status, app policy, and Marvel Rivals terms. If a data point is not clearly permitted, do not collect or display it.

## Platform reality

- **PC:** a desktop companion may be able to relay supported GEP information.
- **PlayStation / console:** this repository has no supported live telemetry integration. The phone cannot directly read the console's process or memory. Do not promise real-time console stats unless an authorised source becomes available.
- **Post-match:** use the stats API where available, subject to API limits and response availability.

## References

- https://dev.overwolf.com/ow-electron/live-game-data-gep/supported-games/marvel-rivals/
- https://dev.overwolf.com/ow-native/live-game-data-gep/live-game-data-gep-intro/
- https://docs.marvelrivalsapi.com/
