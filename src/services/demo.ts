export type HeroSummary = { name: string; matches: number; winRate: number };
export type PlayerSummary = {
  name: string;
  uid: string;
  platform: string;
  rank: string;
  winRate: number;
  kills: number;
  deaths: number;
  wins: number;
  matches: number;
  heroes: HeroSummary[];
};

export const demoPlayer: PlayerSummary = {
  name: "BuckwellBarnes",
  uid: "DEMO-PLAYER",
  platform: "Sample profile",
  rank: "SILVER",
  winRate: 58.4,
  kills: 842,
  deaths: 391,
  wins: 73,
  matches: 125,
  heroes: [
    { name: "Bucky", matches: 42, winRate: 64 },
    { name: "Spider-Man", matches: 31, winRate: 59 },
    { name: "Captain America", matches: 18, winRate: 56 }
  ]
};

export const demoMatches = [
  { id: "m1", hero: "Winter Soldier", mode: "Competitive", map: "Tokyo 2099", when: "Recently", result: "VICTORY", kills: 24, deaths: 5, assists: 11 },
  { id: "m2", hero: "Spider-Man", mode: "Competitive", map: "Hell's Heaven", when: "Recently", result: "DEFEAT", kills: 19, deaths: 8, assists: 7 },
  { id: "m3", hero: "Captain America", mode: "Quick Match", map: "Yggsgard", when: "Earlier", result: "VICTORY", kills: 16, deaths: 4, assists: 14 }
] as const;