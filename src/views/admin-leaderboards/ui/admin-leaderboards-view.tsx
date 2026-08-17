import { getTracks } from "@/features/tracks";
import {
  getLeaderboards,
  LeaderboardAdminList,
  LeaderboardFormDialog,
} from "@/features/leaderboards";

export async function AdminLeaderboardsView() {
  const [leaderboards, tracks] = await Promise.all([
    getLeaderboards(),
    getTracks(),
  ]);
  const trackOptions = tracks.map((track) => ({
    id: track.id,
    name: track.name,
  }));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-extrabold">
          Manage leaderboards
        </h1>
        <LeaderboardFormDialog mode="create" tracks={trackOptions} />
      </div>
      <LeaderboardAdminList leaderboards={leaderboards} tracks={trackOptions} />
    </main>
  );
}
