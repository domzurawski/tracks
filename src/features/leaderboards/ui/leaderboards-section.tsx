import { getLeaderboards } from "../model/leaderboards";
import { LeaderboardCard } from "./leaderboard-card";

export async function LeaderboardsSection() {
  const leaderboards = await getLeaderboards();

  return (
    <section className="flex flex-col gap-7 py-14">
      <div className="flex items-baseline justify-between border-b-2 border-divider pb-4">
        <h2 className="font-heading text-3xl font-extrabold">
          Hottest Leaderboards
        </h2>
        <span className="text-sm text-foreground/60">
          {leaderboards.length} active
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {leaderboards.map((leaderboard) => (
          <LeaderboardCard key={leaderboard.id} leaderboard={leaderboard} />
        ))}
      </div>
    </section>
  );
}
