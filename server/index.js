import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT || 4000);
const apiKey = process.env.MARVEL_RIVALS_API_KEY;
const upstream = "https://marvelrivalsapi.com/api/v1";

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "rivals-intel-api" }));

async function upstreamGet(path) {
  if (!apiKey) {
    const error = new Error("MARVEL_RIVALS_API_KEY is not configured on the server.");
    error.status = 503;
    throw error;
  }
  const response = await fetch(`${upstream}${path}`, {
    headers: { "x-api-key": apiKey, accept: "application/json" }
  });
  if (!response.ok) {
    const error = new Error(`MarvelRivalsAPI returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

app.get("/api/player/:query", async (req, res) => {
  try {
    const raw = await upstreamGet(`/player/${encodeURIComponent(req.params.query)}`);
    // Keep the upstream payload intact for now; inspect its current shape before mapping fields.
    res.json({ player: raw });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "Upstream request failed." });
  }
});

app.get("/api/player/:query/match-history", async (req, res) => {
  try {
    const params = new URLSearchParams();
    for (const key of ["season", "game_mode", "page", "limit"]) {
      if (req.query[key] !== undefined) params.set(key, String(req.query[key]));
    }
    const suffix = params.size ? `?${params.toString()}` : "";
    const raw = await upstreamGet(`/player/${encodeURIComponent(req.params.query)}/match-history${suffix}`);
    res.json(raw);
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "Upstream request failed." });
  }
});

app.get("/api/heroes", async (_req, res) => {
  try {
    res.json(await upstreamGet("/heroes"));
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "Upstream request failed." });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Rivals Intel API listening on http://localhost:${port}`);
});