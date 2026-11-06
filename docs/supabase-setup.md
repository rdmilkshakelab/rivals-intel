# Supabase account setup

Rivals Intel's web account layer is being prepared to use Supabase Auth. This is the intended production account provider for the GitHub Pages website and the mobile clients.

## What the project needs

1. A Supabase project.
2. The Project URL.
3. The publishable key (or legacy anon key). Never send a service-role key to the client or commit it to GitHub.
4. Run the SQL in `supabase/migrations/0001_rivals_intel.sql` in the Supabase SQL editor.
5. Configure the Supabase Auth site URL as `https://rdmilkshakelab.github.io` and add the redirect URL `https://rdmilkshakelab.github.io/rivals-intel/**`.
6. Configure email confirmation and password reset email delivery in Supabase Auth.

## Planned account behavior

- Supabase Auth handles registration, sign-in, email confirmation, password reset and session refresh.
- The `profiles` table stores public account metadata such as username. Row Level Security ensures users can access only their own profile.
- Supabase Auth MFA/TOTP will provide authenticator enrollment and verification.
- `saved_players` stores each user's saved public player lookups.
- The device pairing API remains a server-side capability. It must validate Supabase access tokens before it can issue or revoke TV/desktop device sessions. Do not expose the Supabase service-role key in the website, TV app, Windows app or mobile app.

## Client configuration

The web/mobile client will use these public build-time values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (or the Supabase publishable key)

These are public client configuration values, not secrets. Never use `SUPABASE_SERVICE_ROLE_KEY` in a client build.

## Important

The Supabase schema is a foundation, not a claim that the live account service is already connected. The app still needs the project's URL/key, Auth redirect configuration and a tested client integration before registration can work on the public website. TV QR pairing additionally needs a deployed API service that verifies Supabase JWTs.
