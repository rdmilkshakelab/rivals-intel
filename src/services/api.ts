import type { PlayerSummary } from "./demo";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

type RawHero = { hero_name?: string; matches?: number; wins?: number; win_rate?: string | number };
type RawPlayerResponse = {
  uid?: string | number;
  player?: {
    uid?: string | number;
    nickname?: string;
    name?: string;
    login_os?: string;
    rank?: { rank?: string };
    info?: { login_os?: string };
  };
  overall_stats?: {
    total_matches?: number;
    total_wins?: number;
    ranked?: { total_matches?: number; total_wins?: number; total_kills?: number; total_deaths?: number };
  };
  heroes_ranked?: RawHero[];
};

function normalisePlayer(raw: RawPlayerResponse): PlayerSummary {
  const profile = raw.player ?? {};
  const stats = raw.overall_stats?.ranked ?? raw.overall_stats ?? {};
  const matches = Number(stats.total_matches ?? raw.overall_stats?.total_matches ?? 0);
  const wins = Number(stats.total_wins ?? raw.overall_stats?.total_wins ?? 0);
  const kills = Number(stats.total_kills ?? 0);
  const deaths = Number(stats.total_deaths ?? 0);
  const heroes = (raw.heroes_ranked ?? []).slice(0, 3).map((hero) => ({
    name: hero.hero_name ?? "Unknown hero",
    matches: Number(hero.matches ?? 0),
    winRate: Number.parseFloat(String(hero.win_rate ?? (hero.matches ? (Number(hero.wins ?? 0) / Number(hero.matches)) * 100 : 0))) || 0
  }));

  return {
    name: profile.nickname ?? profile.name ?? "Unknown player",
    uid: String(profile.uid ?? raw.uid ?? "Unknown"),
    platform: profile.info?.login_os ?? profile.login_os ?? "Marvel Rivals",
    rank: profile.rank?.rank ?? "UNRANKED",
    winRate: matches > 0 ? Number(((wins / matches) * 100).toFixed(1)) : 0,
    kills,
    deaths,
    wins,
    matches,
    heroes
  };
}

export async function fetchPlayer(query: string): Promise<PlayerSummary> {
  if (!API_BASE_URL) {
    throw new Error("API proxy is not configured. Set EXPO_PUBLIC_API_BASE_URL.");
  }

  const response = await fetch(`${API_BASE_URL}/api/player/${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`Player lookup failed (${response.status}).`);
  }

  const payload = await response.json() as { player?: RawPlayerResponse };
  if (!payload?.player?.player) {
    throw new Error("The stats service returned an unexpected response or a private profile.");
  }
  return normalisePlayer(payload.player);
}