export type PodiumEntry = {
  rank: string;
  car: string;
  time: string;
  highlight: boolean;
};

export type Leaderboard = {
  title: string;
  trackName: string;
  podium: PodiumEntry[];
};
