import type { PlayerSummary } from "./demo";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

type RecordValue = Record<string, unknown>;
type PlayerPayload = {
  provider?: string;
  username?: string;
  info?: RecordValue;
  overview?: RecordValue;
  heroes?: unknown;
  peakRank?: RecordValue;
  player?: RecordValue;
  overall_stats?: RecordValue;
  heroes_ranked?: unknown[];
  uid?: string | number;
};

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}
function number(source: RecordValue, ...keys: string[]): number {
  for (const key of keys) {
    const value = source[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
function string(source: RecordValue, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
function normaliseMrivals(raw: PlayerPayload): PlayerSummary {
  const info = record(raw.info);
  const overview = record(raw.overview);
  const peak = record(raw.peakRank);
  const lifetimePeak = record(peak.lifetimePeakRanked);
  const heroObject = record(raw.heroes);
  const heroes = Object.entries(heroObject)
    .map(([name, value]) => {
      const stats = record(value);
      return {
        name,
        matches: number(stats, "matchesPlayed", "matches", "totalMatches"),
        winRate: number(stats, "matchesWinPct", "winRate", "win_rate")
      };
    })
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 3);
  const matches = number(overview, "matchesPlayed", "matches", "totalMatches");
  const wins = number(overview, "matchesWon", "wins", "totalWins");
  return {
    name: string(info, "name", "username") ?? raw.username ?? "Unknown player",
    uid: string(info, "uuid", "userid") ?? "Tracker Network",
    platform: string(info, "platform") ?? "Marvel Rivals",
    rank: string(info, "rank") ?? string(lifetimePeak, "displayName", "tierName") ?? "UNRANKED",
    winRate: number(overview, "matchesWinPct", "winRate") || (matches ? Number((wins / matches * 100).toFixed(1)) : 0),
    kills: number(overview, "kills", "totalKills"),
    deaths: number(overview, "deaths", "totalDeaths"),
    wins,
    matches,
    heroes
  };
}
function normaliseMarvelRivalsApi(raw: PlayerPayload): PlayerSummary {
  const profile = record(raw.player);
  const overall = record(raw.overall_stats);
  const stats = record(overall.ranked);
  const matches = number(stats, "total_matches") || number(overall, "total_matches");
  const wins = number(stats, "total_wins") || number(overall, "total_wins");
  const heroList = Array.isArray(raw.heroes_ranked) ? raw.heroes_ranked : [];
  const heroes = heroList.slice(0, 3).map((entry) => {
    const hero = record(entry);
    return {
      name: string(hero, "hero_name", "name") ?? "Unknown hero",
      matches: number(hero, "matches"),
      winRate: number(hero, "win_rate") || (number(hero, "matches") ? number(hero, "wins") / number(hero, "matches") * 100 : 0)
    };
  });
  return {
    name: string(profile, "nickname", "name") ?? "Unknown player",
    uid: String(profile.uid ?? raw.uid ?? "Unknown"),
    platform: string(record(profile.info), "login_os") ?? string(profile, "login_os") ?? "Marvel Rivals",
    rank: string(record(profile.rank), "rank") ?? "UNRANKED",
    winRate: matches ? Number((wins / matches * 100).toFixed(1)) : 0,
    kills: number(stats, "total_kills") || number(overall, "total_kills"),
    deaths: number(stats, "total_deaths") || number(overall, "total_deaths"),
    wins,
    matches,
    heroes
  };
}

export async function fetchPlayer(query: string): Promise<PlayerSummary> {
  if (!API_BASE_URL) throw new Error("API proxy is not configured. Set EXPO_PUBLIC_API_BASE_URL.");
  const response = await fetch(`${API_BASE_URL}/api/player/${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`Player lookup failed (${response.status}).`);
  const payload = await response.json() as { player?: PlayerPayload };
  if (!payload?.player) throw new Error("The stats service returned an unexpected response or a private profile.");
  return payload.player.provider === "mrivals"
    ? normaliseMrivals(payload.player)
    : normaliseMarvelRivalsApi(payload.player);
}
