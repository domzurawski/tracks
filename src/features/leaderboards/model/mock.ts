import type { Leaderboard } from "./types";

export const mockLeaderboards: Leaderboard[] = [
  {
    title: "Fastest overall",
    trackName: "Nürburgring Nordschleife",
    podium: [
      { rank: "01", car: "Porsche 911 GT3", time: "7:12.450", highlight: true },
      { rank: "02", car: "BMW M3", time: "7:24.810", highlight: false },
      {
        rank: "03",
        car: "Renault Mégane R.S.",
        time: "7:48.220",
        highlight: false,
      },
    ],
  },
  {
    title: "Fastest RWD",
    trackName: "Nürburgring Nordschleife",
    podium: [
      { rank: "01", car: "Porsche 911 GT3", time: "7:12.450", highlight: true },
    ],
  },
  {
    title: "Fastest overall",
    trackName: "Circuit de la Sarthe",
    podium: [
      { rank: "01", car: "Porsche 911 GT3", time: "3:48.900", highlight: true },
      { rank: "02", car: "BMW M3", time: "3:55.200", highlight: false },
    ],
  },
  {
    title: "Fastest overall",
    trackName: "Spa-Francorchamps",
    podium: [
      { rank: "01", car: "Porsche 911 GT3", time: "2:18.760", highlight: true },
      { rank: "02", car: "BMW M3", time: "2:22.140", highlight: false },
      {
        rank: "03",
        car: "Renault Mégane R.S.",
        time: "2:31.500",
        highlight: false,
      },
    ],
  },
];
