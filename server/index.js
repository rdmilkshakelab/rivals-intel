import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { initialiseAuth, registerAuthRoutes } from "./auth.js";
import { getStatsProvider, getPlayerProfile, getPlayerMatchHistory, getHeroCatalogue } from "./stats-provider.js";

const app = express();
const port = Number(process.env.PORT || 4000);
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
  const limiter = req.path === "/poll" ? devicePollLimiter : deviceActionLimiter;
  limiter(req, res, next);
});

app.get("/health", (_req, res) => res.json({
  ok: true,
  service: "rivals-intel-api",
  accountsConfigured: Boolean(process.env.DATABASE_URL),
  statsProvider: getStatsProvider()
}));

app.get("/api/player/:query", profileLimiter, async (req, res) => {
  const username = String(req.params.query || "").trim();
  if (!/^[a-zA-Z0-9_. -]{2,32}$/.test(username)) return res.status(400).json({ error: "Enter a valid player username." });
  try {
    const player = await getPlayerProfile(username);
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=240");
    res.json({ player });
  } catch (error) {
    const message = String(error?.message || "Player lookup failed.");
    const notFound = /could not find|not found|does not exist/i.test(message);
    res.status(error.status || (notFound ? 404 : 502)).json({
      error: notFound ? "We couldn't find that public player profile." : message,
      provider: getStatsProvider()
    });
  }
});

app.get("/api/player/:query/match-history", async (req, res) => {
  try {
    res.json(await getPlayerMatchHistory(req.params.query, req.query));
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "Match history lookup failed.", provider: getStatsProvider() });
  }
});

app.get("/api/heroes", async (_req, res) => {
  try {
    res.json(await getHeroCatalogue());
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "Hero catalogue lookup failed.", provider: getStatsProvider() });
  }
});

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
  console.log("Rivals Intel stats provider: " + getStatsProvider());
  app.listen(port, "0.0.0.0", () => console.log("Rivals Intel API listening on http://localhost:" + port));
}
start().catch((error) => {
  console.error("Could not start Rivals Intel API:", error.message);
  process.exit(1);
});
