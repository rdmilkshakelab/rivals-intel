import crypto from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";
import QRCode from "qrcode";

const { Pool } = pg;
const scrypt = promisify(crypto.scrypt);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined });
const SESSION_DAYS = 30;
const DEVICE_CODE_MINUTES = 10;
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString("base64url"); }
function emailNormal(value) { return String(value || "").trim().toLowerCase(); }
function cookieToken(req) {
  const item = (req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith("ri_session="));
  return item ? decodeURIComponent(item.slice(11)) : null;
}
function tokenFrom(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : cookieToken(req);
}
function setCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", "ri_session=" + token + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=" + (SESSION_DAYS * 86400) + secure);
}
function clearCookie(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", "ri_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" + secure);
}
function labelDevice(req, supplied) {
  return String(supplied || req.headers["x-device-name"] || req.headers["user-agent"] || "Unknown device").trim().slice(0, 100) || "Unknown device";
}
async function passwordHash(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return "scrypt:" + salt.toString("hex") + ":" + Buffer.from(key).toString("hex");
}
async function passwordMatches(password, stored) {
  const parts = String(stored || "").split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const expected = Buffer.from(parts[2], "hex");
  const actual = Buffer.from(await scrypt(password, Buffer.from(parts[1], "hex"), expected.length));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
function keyForEncryption() {
  const key = Buffer.from(process.env.AUTH_ENCRYPTION_KEY || "", "base64");
  if (key.length !== 32) throw new Error("AUTH_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}
function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyForEncryption(), iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64")).join(".");
}
function decrypt(value) {
  const parts = String(value).split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyForEncryption(), parts[0]);
  decipher.setAuthTag(parts[1]);
  return Buffer.concat([decipher.update(parts[2]), decipher.final()]).toString("utf8");
}
function encodeBase32(buffer) {
  let bits = 0, value = 0, output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}
function decodeBase32(value) {
  let bits = 0, buffer = 0;
  const output = [];
  for (const char of value.replace(/=+$/g, "").toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Invalid authenticator secret.");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) { output.push((buffer >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(output);
}
function totp(secret, time = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(time / 30000)));
  const digest = crypto.createHmac("sha1", decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0");
}
function validTotp(secret, code) {
  const supplied = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(supplied)) return false;
  return [-1, 0, 1].some((step) => crypto.timingSafeEqual(Buffer.from(totp(secret, Date.now() + step * 30000)), Buffer.from(supplied)));
}
function recoveryCodes() {
  return Array.from({ length: 10 }, () => randomToken(8).toUpperCase().replace(/[-_]/g, "").slice(0, 10));
}
function userCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.randomBytes(8), (byte) => chars[byte % chars.length]).join("").match(/.{1,4}/g).join("-");
}

export async function initialiseAuth() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to enable accounts.");
  keyForEncryption();
  keyForEncryption();
  await pool.query(
    "CREATE TABLE IF NOT EXISTS ri_users (" +
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, " +
    "totp_secret TEXT, totp_pending_secret TEXT, totp_enabled BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());" +
    "CREATE TABLE IF NOT EXISTS ri_sessions (" +
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES ri_users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, " +
    "device_name TEXT NOT NULL, user_agent TEXT, ip_address INET, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
    "expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ);" +
    "CREATE TABLE IF NOT EXISTS ri_recovery_codes (" +
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES ri_users(id) ON DELETE CASCADE, code_hash TEXT NOT NULL, used_at TIMESTAMPTZ);" +
    "CREATE TABLE IF NOT EXISTS ri_device_codes (" +
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), device_code_hash TEXT NOT NULL UNIQUE, user_code TEXT NOT NULL UNIQUE, device_name TEXT NOT NULL, " +
    "status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','consumed')), user_id UUID REFERENCES ri_users(id) ON DELETE CASCADE, " +
    "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL);" +
    "CREATE INDEX IF NOT EXISTS ri_sessions_user_idx ON ri_sessions(user_id);" +
    "CREATE INDEX IF NOT EXISTS ri_device_codes_expiry_idx ON ri_device_codes(expires_at);"
  );
}

export async function requireAccount(req, res, next) {
  try {
    const token = tokenFrom(req);
    if (!token) return res.status(401).json({ error: "Sign in to continue." });
    const result = await pool.query(
      "SELECT s.id AS session_id, s.user_id, s.device_name, u.email, u.username, u.totp_enabled " +
      "FROM ri_sessions s JOIN ri_users u ON u.id = s.user_id " +
      "WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()",
      [sha256(token)]
    );
    if (!result.rowCount) return res.status(401).json({ error: "Session expired. Please sign in again." });
    req.account = result.rows[0];
    await pool.query("UPDATE ri_sessions SET last_seen_at = NOW() WHERE id = $1", [req.account.session_id]);
    next();
  } catch (error) { next(error); }
}

async function createSession(userId, req, res, suppliedName) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await pool.query(
    "INSERT INTO ri_sessions (user_id,token_hash,device_name,user_agent,ip_address,expires_at) VALUES ($1,$2,$3,$4,$5,$6)",
    [userId, sha256(token), labelDevice(req, suppliedName), String(req.headers["user-agent"] || "").slice(0, 500), req.ip, expires]
  );
  setCookie(res, token);
  return token;
}

export function registerAuthRoutes(app) {
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const email = emailNormal(req.body.email);
      const username = String(req.body.username || "").trim();
      const password = String(req.body.password || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return res.status(400).json({ error: "Username must be 3-24 letters, numbers or underscores." });
      if (password.length < 12 || password.length > 128) return res.status(400).json({ error: "Password must be at least 12 characters." });
      const result = await pool.query("INSERT INTO ri_users (email,username,password_hash) VALUES ($1,$2,$3) RETURNING id,email,username", [email, username, await passwordHash(password)]);
      const token = await createSession(result.rows[0].id, req, res, req.body.deviceName);
      const response = { user: result.rows[0], note: "Email verification must be enabled before public launch." };
      if (req.headers["x-ri-client"] === "native") response.token = token;
      res.status(201).json(response);
    } catch (error) {
      if (error.code === "23505") return res.status(409).json({ error: "That email address or username is already registered." });
      next(error);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const result = await pool.query("SELECT * FROM ri_users WHERE email = $1", [emailNormal(req.body.email)]);
      const user = result.rows[0];
      if (!user || !(await passwordMatches(String(req.body.password || ""), user.password_hash))) return res.status(401).json({ error: "Email or password is incorrect." });
      if (user.totp_enabled) {
        let valid = validTotp(decrypt(user.totp_secret), req.body.totpCode);
        if (!valid && req.body.recoveryCode) {
          const hash = sha256(String(req.body.recoveryCode).replace(/\s/g, "").toUpperCase());
          const used = await pool.query("UPDATE ri_recovery_codes SET used_at=NOW() WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL RETURNING id", [user.id, hash]);
          valid = Boolean(used.rowCount);
        }
        if (!valid) return res.status(401).json({ error: "A valid authenticator or unused recovery code is required.", requiresTwoFactor: true });
      }
      const token = await createSession(user.id, req, res, req.body.deviceName);
      const response = { user: { id: user.id, email: user.email, username: user.username, twoFactorEnabled: user.totp_enabled } };
      if (req.headers["x-ri-client"] === "native") response.token = token;
      res.json(response);
    } catch (error) { next(error); }
  });

  app.post("/api/auth/logout", requireAccount, async (req, res, next) => {
    try { await pool.query("UPDATE ri_sessions SET revoked_at=NOW() WHERE id=$1", [req.account.session_id]); clearCookie(res); res.json({ ok: true }); }
    catch (error) { next(error); }
  });
  app.get("/api/auth/me", requireAccount, (req, res) => res.json({ user: { id: req.account.user_id, email: req.account.email, username: req.account.username, twoFactorEnabled: req.account.totp_enabled } }));

  app.get("/api/account/devices", requireAccount, async (req, res, next) => {
    try {
      const result = await pool.query(
        "SELECT id,device_name AS name,user_agent,created_at,last_seen_at,expires_at,(id=$2) AS current " +
        "FROM ri_sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>NOW() ORDER BY last_seen_at DESC",
        [req.account.user_id, req.account.session_id]
      );
      res.json({ devices: result.rows });
    } catch (error) { next(error); }
  });
  app.delete("/api/account/devices/:id", requireAccount, async (req, res, next) => {
    try {
      const result = await pool.query("UPDATE ri_sessions SET revoked_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING id", [req.params.id, req.account.user_id]);
      if (!result.rowCount) return res.status(404).json({ error: "Device session not found." });
      res.json({ ok: true });
    } catch (error) { next(error); }
  });
  app.patch("/api/account/devices/:id", requireAccount, async (req, res, next) => {
    try {
      const name = String(req.body.name || "").trim().slice(0, 40);
      if (!name) return res.status(400).json({ error: "Enter a device name." });
      const result = await pool.query("UPDATE ri_sessions SET device_name=$1 WHERE id=$2 AND user_id=$3 AND revoked_at IS NULL RETURNING id,device_name", [name, req.params.id, req.account.user_id]);
      if (!result.rowCount) return res.status(404).json({ error: "Device session not found." });
      res.json({ ok: true, device: result.rows[0] });
    } catch (error) { next(error); }
  });

  app.post("/api/account/devices/sign-out-others", requireAccount, async (req, res, next) => {
    try {
      await pool.query("UPDATE ri_sessions SET revoked_at=NOW() WHERE user_id=$1 AND id<>$2 AND revoked_at IS NULL", [req.account.user_id, req.account.session_id]);
      res.json({ ok: true });
    } catch (error) { next(error); }
  });

  app.post("/api/account/totp/setup", requireAccount, async (req, res, next) => {
    try {
      const secret = encodeBase32(crypto.randomBytes(20));
      await pool.query("UPDATE ri_users SET totp_pending_secret=$1 WHERE id=$2", [encrypt(secret), req.account.user_id]);
      const label = encodeURIComponent("Rivals Intel:" + req.account.email);
      const uri = "otpauth://totp/" + label + "?secret=" + secret + "&issuer=Rivals%20Intel&algorithm=SHA1&digits=6&period=30";
      const qrCodeDataUrl = await QRCode.toDataURL(uri, { errorCorrectionLevel: "M", margin: 2, width: 240 });
      res.json({ secret, otpauthUri: uri, qrCodeDataUrl });
    } catch (error) { next(error); }
  });
  app.post("/api/account/totp/confirm", requireAccount, async (req, res, next) => {
    try {
      const result = await pool.query("SELECT totp_pending_secret FROM ri_users WHERE id=$1", [req.account.user_id]);
      if (!result.rows[0] || !result.rows[0].totp_pending_secret) return res.status(400).json({ error: "Start authenticator setup first." });
      const secret = decrypt(result.rows[0].totp_pending_secret);
      if (!validTotp(secret, req.body.code)) return res.status(400).json({ error: "That code is not valid. Check your authenticator and try again." });
      const codes = recoveryCodes();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("UPDATE ri_users SET totp_secret=$1,totp_pending_secret=NULL,totp_enabled=TRUE WHERE id=$2", [encrypt(secret), req.account.user_id]);
        await client.query("DELETE FROM ri_recovery_codes WHERE user_id=$1", [req.account.user_id]);
        for (const code of codes) await client.query("INSERT INTO ri_recovery_codes (user_id,code_hash) VALUES ($1,$2)", [req.account.user_id, sha256(code)]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
      res.json({ enabled: true, recoveryCodes: codes });
    } catch (error) { next(error); }
  });
  app.post("/api/account/totp/disable", requireAccount, async (req, res, next) => {
    try {
      const result = await pool.query("SELECT totp_secret,password_hash,totp_enabled FROM ri_users WHERE id=$1", [req.account.user_id]);
      const user = result.rows[0];
      if (!user.totp_enabled) return res.status(400).json({ error: "Authenticator is not enabled." });
      if (!(await passwordMatches(String(req.body.password || ""), user.password_hash))) return res.status(401).json({ error: "Confirm your password to disable two-factor authentication." });
      if (!validTotp(decrypt(user.totp_secret), req.body.code)) return res.status(400).json({ error: "Enter a valid authenticator code." });
      await pool.query("UPDATE ri_users SET totp_secret=NULL,totp_pending_secret=NULL,totp_enabled=FALSE WHERE id=$1", [req.account.user_id]);
      await pool.query("DELETE FROM ri_recovery_codes WHERE user_id=$1", [req.account.user_id]);
      res.json({ enabled: false });
    } catch (error) { next(error); }
  });

  app.post("/api/device/authorise", async (req, res, next) => {
    try {
      await pool.query("DELETE FROM ri_device_codes WHERE expires_at < NOW() - INTERVAL '1 day'");
      const device = randomToken(32);
      const code = userCode();
      const expires = new Date(Date.now() + DEVICE_CODE_MINUTES * 60000);
      await pool.query("INSERT INTO ri_device_codes (device_code_hash,user_code,device_name,expires_at) VALUES ($1,$2,$3,$4)", [sha256(device), code, labelDevice(req, req.body.deviceName), expires]);
      const verificationUri = (process.env.PUBLIC_WEB_URL || "https://rivalsintel.com") + "/activate?code=" + encodeURIComponent(code);
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUri, { errorCorrectionLevel: "M", margin: 2, width: 260 });
      res.status(201).json({ deviceCode: device, userCode: code, verificationUri, qrCodeDataUrl, expiresIn: DEVICE_CODE_MINUTES * 60, interval: 5 });
    } catch (error) { next(error); }
  });
  app.post("/api/device/approve", requireAccount, async (req, res, next) => {
    try {
      const code = String(req.body.userCode || "").toUpperCase().trim();
      const result = await pool.query("UPDATE ri_device_codes SET status='approved',user_id=$1 WHERE user_code=$2 AND status='pending' AND expires_at>NOW() RETURNING device_name", [req.account.user_id, code]);
      if (!result.rowCount) return res.status(400).json({ error: "That code has expired, was already used, or is incorrect." });
      res.json({ approved: true, deviceName: result.rows[0].device_name });
    } catch (error) { next(error); }
  });
  app.post("/api/device/poll", async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT * FROM ri_device_codes WHERE device_code_hash=$1 AND expires_at>NOW() FOR UPDATE", [sha256(String(req.body.deviceCode || ""))]);
      const device = result.rows[0];
      if (!device) { await client.query("COMMIT"); return res.status(400).json({ error: "Device code expired. Start again on your TV." }); }
      if (device.status === "pending") { await client.query("COMMIT"); return res.json({ status: "pending" }); }
      if (device.status !== "approved" || !device.user_id) { await client.query("COMMIT"); return res.status(400).json({ error: "Device authorisation is no longer available." }); }
      const token = randomToken();
      const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
      await client.query("INSERT INTO ri_sessions (user_id,token_hash,device_name,user_agent,ip_address,expires_at) VALUES ($1,$2,$3,$4,$5,$6)", [device.user_id, sha256(token), device.device_name, String(req.headers["user-agent"] || "").slice(0, 500), req.ip, expires]);
      await client.query("UPDATE ri_device_codes SET status='consumed' WHERE id=$1", [device.id]);
      await client.query("COMMIT");
      res.json({ status: "complete", token, expiresAt: expires });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally { client.release(); }
  });
}
