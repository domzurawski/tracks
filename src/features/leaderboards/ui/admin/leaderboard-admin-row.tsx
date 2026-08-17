import { LeaderboardFormDialog } from "./leaderboard-form-dialog";
import type { TrackOption } from "./leaderboard-form-dialog";
import { DeleteLeaderboardButton } from "./delete-leaderboard-button";
import type { Leaderboard } from "../../model/types";

export function LeaderboardAdminRow({
  leaderboard,
  tracks,
}: {
  leaderboard: Leaderboard;
  tracks: TrackOption[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-divider p-5">
      <div className="flex flex-col gap-0.5">
        <span className="font-heading text-lg font-extrabold">
          {leaderboard.title}
        </span>
        <span className="text-sm text-foreground/60">
          {leaderboard.trackName}
        </span>
      </div>
      <div className="flex gap-2.5">
        <LeaderboardFormDialog
          mode="edit"
          leaderboard={leaderboard}
          tracks={tracks}
        />
        <DeleteLeaderboardButton
          leaderboardId={leaderboard.id}
          leaderboardTitle={leaderboard.title}
        />
      </div>
    </div>
  );
}
