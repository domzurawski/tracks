export type Drivetrain = "FWD" | "RWD" | "AWD";
export type Transmission = "MANUAL" | "AUTOMATIC";

export type Car = {
  id: string;
  make: string;
  model: string;
  year: number;
  horsepower: number;
  drivetrain: Drivetrain;
  transmission: Transmission;
  nickname: string | null;
  photoUrl: string | null;
  notes: string | null;
};

export type Garage = {
  personalBest: string;
  personalBestTrack: string;
  rank: number;
};
