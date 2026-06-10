export type User = {
  name: string;
  balance: number;
};

export type LeaderboardUser = {
  name: string;
  balance: number;
  streak: number;
  lose: number;
};

export type Card = {
  suit: string;
  rank: string;
  value: number;
};