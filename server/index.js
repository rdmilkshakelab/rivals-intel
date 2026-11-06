import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { initialiseAuth, registerAuthRoutes } from "./auth.js";
import { API } from "mrivals";

const app = express();
const port = Number(process.env.PORT || 4000);
const profileCache = new Map();
const PROFILE_CACHE_TTL = Number(process.env.MRIVALS_CACHE_SECONDS || 300) * 1000;
const profileLimiter = rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: "draft-7", legacyHeaders: false });
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "").split(",").map((value) => value.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("This origin is not allowed by Rivals Intel."));
  },
  credentials: true
}));
app.use(express.json({ limit: "32kb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api/account", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));
const devicePollLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 150, standardHeaders: "draft-7", legacyHeaders: false });
const deviceActionLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false });
app.use("/api/device", (req, res, next) => {
  // A 5-second poll over the 10-minute pairing window needs up to 120 requests.
  const limiter = req.path === "/poll" ? devicePollLimiter : deviceActionLimiter;
  limiter(req, res, next);
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "rivals-intel-api", accountsConfigured: Boolean(process.env.DATABASE_URL) }));

async function fetchMrivalsProfile(username) {
  const key = username.trim().toLowerCase();
  const cached = profileCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { ...cached.data, cached: true };
  const options = {};
  if (process.env.MRIVALS_FLARESOLVERR_URL) options.flaresolverrUrl = process.env.MRIVALS_FLARESOLVERR_URL;
  else if (process.env.MRIVALS_USE_CURL === "true") options.useCurl = true;
  const user = await API.fetchUser(username, options);
  const data = { username, info: user.info(), overview: user.overview(), heroes: user.heroes(), roles: user.roles(), peakRank: user.peakRank(), source: "Tracker Network via mrivals", fetchedAt: new Date().toISOString(), cached: false };
  profileCache.set(key, { data, expiresAt: Date.now() + PROFILE_CACHE_TTL });
  if (profileCache.size > 500) { const oldest = profileCache.keys().next().value; if (oldest) profileCache.delete(oldest); }
  return data;
}

app.get("/api/player/:query", profileLimiter, async (req, res) => {
  const username = String(req.params.query || "").trim();
  if (!/^[a-zA-Z0-9_. -]{2,32}$/.test(username)) return res.status(400).json({ error: "Enter a valid player username." });
  try {
    const player = await fetchMrivalsProfile(username);
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=240");
    res.json({ player });
  } catch (error) {
    const message = String(error?.message || "Tracker Network lookup failed.");
    const notFound = /could not find|not found|does not exist/i.test(message);
    res.status(notFound ? 404 : 502).json({ error: notFound ? "We couldn't find that public Tracker Network profile." : "Tracker Network is temporarily unavailable. Please try again shortly.", source: "mrivals" });
  }
});
app.get("/api/player/:query/match-history", (_req, res) => res.status(501).json({ error: "Match history is not currently exposed by mrivals." }));
app.get("/api/heroes", (_req, res) => res.status(501).json({ error: "A global hero catalogue is not exposed by mrivals." }));

registerAuthRoutes(app);
app.use((error, _req, res, _next) => {
  console.error("Rivals Intel API error:", error.message);
  res.status(error.status || 500).json({ error: error.status && error.status < 500 ? error.message : "An unexpected server error occurred." });
});

async function start() {
  if (process.env.DATABASE_URL) {
    await initialiseAuth();
    console.log("Rivals Intel account database is ready.");
  } else {
    console.warn("DATABASE_URL is missing. Stats endpoints are available; account endpoints are not configured.");
  }
  app.listen(port, "0.0.0.0", () => console.log("Rivals Intel API listening on http://localhost:" + port));
}
start().catch((error) => {
  console.error("Could not start Rivals Intel API:", error.message);
  process.exit(1);
});
