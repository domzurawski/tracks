import { ActivityTicker } from "@/features/activity";
import { getCurrentUser } from "@/features/auth";
import { GarageBar } from "@/features/garage";
import { LeaderboardsSection } from "@/features/leaderboards";
import { TracksSection } from "@/features/tracks";
import { Hero } from "./hero";

export async function HomeView() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-6 md:px-12">
      <Hero />
      <ActivityTicker />
      {user && <GarageBar userId={user.id} />}
      <LeaderboardsSection />
      <TracksSection />
    </main>
  );
}
