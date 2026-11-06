# Multi-platform architecture

## Goal

Rivals Intel is one product across iPhone, iPad, Dynamic Island, Google TV, Mac, and Windows. Keep one source of truth for player data and shared business logic, while giving each platform an interface that fits its interaction model.

Do not create a separate repository for each platform. Keep this repository as the product monorepo until a genuine technical or team boundary justifies splitting it.

## Recommended architecture

```text
rivals-intel/
├── app/                         # Expo Router mobile app (iPhone/iPad/Android)
├── src/
│   ├── components/              # Shared React Native UI components
│   ├── services/                # API clients and data access
│   ├── theme/                   # Shared design tokens
│   └── types/                   # Shared domain types (future extraction)
├── server/                      # Node API proxy; secrets stay server-side
├── docs/                        # Architecture, platform and integration docs
├── platforms/                   # Native/desktop/TV projects when introduced
│   ├── ios/                     # Swift extensions and Live Activities (future)
│   ├── windows/                 # Overwolf companion (future)
│   ├── macos/                   # Native Mac shell only if needed (future)
│   └── tv/                      # Google TV app only if RN TV proves suitable (future)
└── package.json
```

This is a target shape, not a request to create empty platform projects now. Keep the current Expo app and server in place.

## What should be shared

- Domain models for player profiles, hero summaries, match history and permitted live-session data.
- API request/response handling, validation and normalisation.
- Shared account/session concepts and API contracts. The current foundation includes email/password auth, optional TOTP, one-time recovery codes, device sessions and QR/device-code pairing; the UI and backend still need live-database and production validation.
- Design tokens: colours, spacing, typography and semantic status colours.
- Business rules and formatting for statistics.
- Backend services and the server-side upstream API key.

The shared data layer should not import React Native UI or native platform APIs. Platform adapters should translate native events into shared domain models.

## Platform responsibilities

| Platform | Recommended implementation | Platform-specific work |
|---|---|---|
| iPhone | Existing Expo + React Native app | iOS builds, permissions, app-store packaging |
| iPad | Same Expo app with responsive layouts | Split layouts, larger charts, sidebar/navigation |
| Dynamic Island | iOS ActivityKit Live Activity | Swift, WidgetKit extension, ActivityKit lifecycle and push/update strategy |
| Google TV | Dedicated Android TV interface | TV launcher, D-pad focus, remote navigation, 10-foot typography; verify React Native TV support before choosing the implementation |
| Mac | Start with a responsive web app or evaluate a Mac Catalyst/native shell | Menu-bar features and native integrations only if justified |
| Windows | Dedicated Windows desktop companion | Overwolf GEP integration, desktop lifecycle, pairing and secure relay |

### iPhone and iPad

Continue with Expo and React Native. Build responsive layouts rather than maintaining two app codebases. Use compact navigation on iPhone and make better use of available width on iPad. Validate both form factors before adding new targets.

### Dynamic Island

Dynamic Island is not an ordinary React Native screen or a generic widget. It is presented through an iOS Live Activity built with ActivityKit and a WidgetKit extension, normally implemented in Swift. The app/backend can share the permitted session model, but the Live Activity UI and lifecycle are native.

Only show data that is explicitly permitted by current Marvel Rivals and Overwolf rules. Keep the display minimal and do not surface restricted confidential information or competitive predictions.

### Google TV

Treat TV as a separate interaction design. Users navigate with a remote, not touch. Every interactive element needs predictable D-pad focus, visible focus state, readable distance typography and simple navigation. First validate a small TV proof of concept before choosing a React Native TV fork or a native Android TV implementation.

### Mac

Do not build a Mac app just to have a Mac binary. First make the shared dashboard work well in a browser at desktop widths. Then decide whether a native Mac wrapper is worthwhile. Native menu-bar behaviour or system integration can be added later without duplicating the data layer.

### Windows

Windows has two distinct purposes:
1. A desktop dashboard for Rivals Intel.
2. A future Overwolf companion that receives supported Marvel Rivals Game Events Provider (GEP) events.

Keep these responsibilities separate. The companion should validate and filter events, pair securely with a Rivals Intel account/session, and relay only the minimum permitted data. Do not make the phone app responsible for reading the game.

## Backend and security

- Keep the MarvelRivalsAPI key in the server environment only.
- Do not put secrets in `EXPO_PUBLIC_*` variables or commit local `.env` files.
- Validate and normalise upstream responses at the server boundary where practical.
- Add authentication, short-lived pairing codes, rate limits and authenticated realtime transport before any live companion is exposed publicly.
- Treat third-party API data as optional: profiles may be private, incomplete, rate-limited or unavailable.
- Do not store or display data that current game, API or Overwolf policies prohibit.

## Current repository snapshot (checked 2026-11-06)

The repository now contains more than the original dashboard starter:

- Expo SDK 58, React Native and TypeScript app with a sample-data player dashboard.
- Account screen for registration/login, authenticator setup, recovery codes and device-session management.
- Activation, device-login and in-app QR-scanner routes.
- Express API with PostgreSQL account/session tables, TOTP support, device pairing and the server-side stats API proxy.
- The latest GitHub Actions run passes app TypeScript typechecking and server JavaScript syntax checks. CI does not yet build Expo targets or exercise the database/auth flows.

The latest CI install also reported five moderate npm advisories; inspect them with `npm audit`, fix them deliberately and commit lockfiles so installs are reproducible. Do not use a blanket force-upgrade without reviewing breaking changes.

The account and pairing code is a foundation, not a production-ready identity service. Email verification, password reset, new-device alerts, a live PostgreSQL deployment, automated auth tests, security review and deployment configuration remain outstanding. The dashboard still uses sample match history. The repository has no completed iOS Live Activity, Google TV package, native Mac app or Windows Overwolf companion.

### Immediate priority

1. Keep the existing Expo app as the only mobile codebase; do not fork separate mobile apps yet.
2. Run the app in Codespaces and confirm the dashboard, account routes and QR scanner render on a real phone.
3. Start the API and verify `/health`; then configure PostgreSQL privately and smoke-test registration, TOTP, sessions and device pairing.
4. Connect and inspect real player and match-history responses before removing sample labels.
5. Make the same app responsive for iPad and browser widths. Treat the browser dashboard as the first Mac experience.
6. Only after those gates pass, prototype Google TV remote navigation, then investigate native iOS Live Activities and the Windows Overwolf companion separately.

## Recommended delivery phases

### Phase 0: stabilise the current foundation

1. Recover a reliable Codespaces development environment.
2. Install dependencies and run `npm run typecheck`.
3. Start the Expo app and confirm the dashboard renders.
4. Start the server and verify `GET /health`.
5. Connect a real profile using a privately stored API key.
6. Replace the sample match-history section only after the upstream response has been inspected and normalised.
7. Add loading, empty, private-profile and upstream-error states.

### Phase 1: complete iPhone and iPad

- Improve navigation and screen structure.
- Add player profile and match-history detail views.
- Make layouts responsive for phone and tablet.
- Test on iPhone and iPad sizes before release work.

### Phase 2: shared web and desktop dashboard

- Make the web build useful at laptop and desktop widths.
- Add keyboard navigation and accessible focus states.
- Evaluate Mac packaging only after the web experience is stable.

### Phase 3: Windows live companion research/prototype

- Re-check current GEP availability and compliance requirements.
- Build a minimal event-only prototype before implementing pairing.
- Add authenticated pairing and relay only after permitted fields are confirmed.
- Do not claim console live telemetry.

### Phase 4: native platform experiences

- Implement iOS Live Activities for carefully selected permitted live-session information.
- Build a Google TV proof of concept with remote-first navigation.
- Decide whether a native Mac shell or separate Windows dashboard adds enough value.

## Validation gates

Do not move to the next phase just because files exist. Each phase needs a running build, a documented test, and a clear statement of what data is real versus sample data.

The current repository has not yet been confirmed installed, typechecked, built or connected to a live stats API. Those are the first validation tasks.
