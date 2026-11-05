# Accounts, security and device pairing

## What is implemented

The account foundation is shared by the Expo mobile app and Expo web build.

- Email + username + password registration and email/password login.
- Passwords are hashed with Node.js scrypt. Raw passwords are never stored.
- Server-side sessions expire after 30 days. Only a SHA-256 hash of each session token is stored in PostgreSQL.
- Mobile session tokens are stored with Expo SecureStore. Web uses an HttpOnly, SameSite=Lax cookie and does not persist the token in localStorage.
- The account Devices screen lists sessions, last activity and current-device status, and supports individual sign-out and sign-out of other devices.
- TOTP authenticator enrollment produces a standard otpauth URI and QR code. It works with Google Authenticator, Microsoft Authenticator and other compatible apps.
- TOTP secrets are encrypted at rest with AES-256-GCM using AUTH_ENCRYPTION_KEY.
- Ten one-time recovery codes are generated on enrollment; only hashes are stored.
- TV/device authorisation creates a random device secret plus a short user code. The TV polls with its private device secret. A signed-in user approves the short code, and the server returns a new session token once.
- Account and device endpoints have basic IP-based rate limiting.

## Not yet production-complete

This is an implementation foundation, not a public account service ready for launch.

- Email verification and password-reset email delivery are not connected to an email provider. Registration currently signs the user in immediately. Do not open public registration until verification and recovery flows are completed.
- New-device email/push alerts are not connected.
- A full TV-specific remote-control interface is not implemented.
- The QR activation URL assumes the deployed web app is hosted at PUBLIC_WEB_URL and serves the Expo Router /activate route.
- The account service has not been run against a live PostgreSQL instance, load-tested, penetration-tested or audited.
- Production deployment still needs HTTPS, backups, database migrations, monitoring, secret rotation and a reviewed privacy policy/terms.

## Server configuration

Create a persistent PostgreSQL database, then configure server/.env:

- DATABASE_URL: PostgreSQL connection string.
- DATABASE_SSL=true: use TLS for hosted databases.
- AUTH_ENCRYPTION_KEY: base64-encoded 32-byte key. Generate with openssl rand -base64 32. Keep it private and back it up securely. Losing it makes existing TOTP secrets unreadable.
- ALLOWED_ORIGIN: comma-separated exact browser origins, including the deployed web origin. Do not use *.
- PUBLIC_WEB_URL: public origin of the web app, without a trailing slash.
- MARVEL_RIVALS_API_KEY: upstream stats key, kept server-side only.

Install server dependencies and start the API:

~~~bash
cd server
npm install
cp .env.example .env
npm run dev
~~~

Set the root .env value EXPO_PUBLIC_API_BASE_URL to the reachable API origin. For a physical phone, use the Codespaces forwarded port URL or your computer's LAN IP, not localhost.

The server creates the initial account tables on startup. A managed migration process should replace this bootstrap schema before production.

## Account API

| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/register | Create an account |
| POST | /api/auth/login | Sign in, optionally with TOTP or recovery code |
| POST | /api/auth/logout | Revoke current session |
| GET | /api/auth/me | Current account |
| GET | /api/account/devices | List active sessions |
| DELETE | /api/account/devices/:id | Revoke one session |
| PATCH | /api/account/devices/:id | Rename a device session |
| POST | /api/account/devices/sign-out-others | Revoke every other session |
| POST | /api/account/totp/setup | Generate authenticator QR and secret |
| POST | /api/account/totp/confirm | Verify code and enable TOTP |
| POST | /api/account/totp/disable | Disable TOTP after password + code |
| POST | /api/device/authorise | Create TV/device code and QR |
| POST | /api/device/approve | Approve a device code from a signed-in account |
| POST | /api/device/poll | Poll and exchange approved device code for a session |

Native clients send the session as a bearer token stored by SecureStore. Web clients use the HttpOnly session cookie with credentialed requests. Never log tokens, TOTP secrets, recovery codes or passwords.

## Device pairing sequence

1. TV calls /api/device/authorise and receives a private device code, short user code and QR code.
2. User scans the QR or opens the activation URL. If necessary, they sign into their account first.
3. User confirms the displayed device code on /activate.
4. TV polls /api/device/poll using the private device code.
5. Once approved, the server creates a session for that TV, marks the pairing code consumed and returns the session token exactly once.
6. The TV stores its token securely and uses it for later API requests.

The short user code is not itself a login credential. The private device code is random, stored hashed on the server and expires after ten minutes. Approval is explicit and each code can be consumed only once.
