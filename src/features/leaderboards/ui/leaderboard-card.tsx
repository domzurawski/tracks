import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/shared/ui";
import type { Leaderboard } from "../model/types";

export function LeaderboardCard({ leaderboard }: { leaderboard: Leaderboard }) {
  return (
    <div className="flex flex-col gap-4 border border-divider bg-background p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-accent-700 uppercase">
          <MapPin className="h-3 w-3" />
          {leaderboard.trackName}
        </div>
        <h3 className="font-heading text-xl font-extrabold">
          {leaderboard.title}
        </h3>
      </div>
      <Button
        href={`/leaderboards/${leaderboard.id}`}
        variant="ghost"
        className="mt-1"
      >
        View full leaderboard
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
