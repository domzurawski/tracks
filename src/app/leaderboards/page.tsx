import type { Metadata } from "next";
import { LeaderboardsView } from "@/views/leaderboards";

export const metadata: Metadata = {
  title: "Leaderboards",
  description: "Browse every leaderboard on Tracks Inc.",
};

export default function LeaderboardsPage() {
  return <LeaderboardsView />;
}
