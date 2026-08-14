import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import type { Leaderboard } from "../model/types";

export function LeaderboardCard({ leaderboard }: { leaderboard: Leaderboard }) {
  return (
    <div className="flex flex-col gap-4 bg-background p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-accent-700 uppercase">
          <MapPin className="h-3 w-3" />
          {leaderboard.trackName}
        </div>
        <h3 className="font-heading text-xl font-extrabold">
          {leaderboard.title}
        </h3>
      </div>
      <div className="flex flex-col">
        {leaderboard.podium.map((entry) => (
          <div
            key={entry.rank}
            className={cn(
              "flex items-center gap-3 border-l-2 px-3 py-2.5",
              entry.highlight
                ? "border-accent-500 bg-accent-100"
                : "border-transparent",
            )}
          >
            <span
              className={cn(
                "w-5 font-heading text-sm font-extrabold",
                entry.highlight ? "text-accent-700" : "text-foreground",
              )}
            >
              {entry.rank}
            </span>
            <span className="flex-1 text-sm font-semibold">{entry.car}</span>
            <span className="font-heading text-sm font-extrabold tabular-nums">
              {entry.time}
            </span>
          </div>
        ))}
      </div>
      <Button href="/leaderboards" variant="ghost" className="mt-1">
        View full leaderboard
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
