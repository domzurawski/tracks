import { mockLeaderboards } from "../model/mock";
import { LeaderboardCard } from "./leaderboard-card";

export function LeaderboardsSection() {
  return (
    <section className="flex flex-col gap-7 py-14">
      <div className="flex items-baseline justify-between border-b-2 border-divider pb-4">
        <h2 className="font-heading text-3xl font-extrabold">
          Hottest Leaderboards
        </h2>
        <span className="text-sm text-foreground/60">
          {mockLeaderboards.length} active
        </span>
      </div>
      <div className="grid grid-cols-1 gap-px bg-divider md:grid-cols-2">
        {mockLeaderboards.map((leaderboard) => (
          <LeaderboardCard
            key={`${leaderboard.title}-${leaderboard.trackName}`}
            leaderboard={leaderboard}
          />
        ))}
      </div>
    </section>
  );
}
