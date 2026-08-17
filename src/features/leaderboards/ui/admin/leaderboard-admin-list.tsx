import { LeaderboardAdminRow } from "./leaderboard-admin-row";
import type { TrackOption } from "./leaderboard-form-dialog";
import type { Leaderboard } from "../../model/types";

export function LeaderboardAdminList({
  leaderboards,
  tracks,
}: {
  leaderboards: Leaderboard[];
  tracks: TrackOption[];
}) {
  if (leaderboards.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        No leaderboards yet — add the first one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {leaderboards.map((leaderboard) => (
        <LeaderboardAdminRow
          key={leaderboard.id}
          leaderboard={leaderboard}
          tracks={tracks}
        />
      ))}
    </div>
  );
}
