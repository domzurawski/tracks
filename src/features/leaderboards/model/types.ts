export type Leaderboard = {
  id: string;
  title: string;
  trackId: string;
  trackName: string;
};

export type LeaderboardEntry = {
  id: string;
  leaderboardId: string;
  driverId: string;
  driverName: string;
  carId: string | null;
  timeMs: number;
  carMake: string;
  carModel: string;
  carYear: number;
  carHorsepower: number;
  carDrivetrain: "FWD" | "RWD" | "AWD";
  carTransmission: "MANUAL" | "AUTOMATIC";
  carNickname: string | null;
  carNotes: string | null;
  createdAt: Date;
};
