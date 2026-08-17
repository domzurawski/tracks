import { LeaderboardsSection } from "@/features/leaderboards";

export function LeaderboardsView() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-6 md:px-12">
      <h1 className="sr-only">Leaderboards</h1>
      <LeaderboardsSection />
    </main>
  );
}
