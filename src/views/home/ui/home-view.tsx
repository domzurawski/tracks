import { ActivityTicker } from "@/features/activity";
import { GarageBar } from "@/features/garage";
import { LeaderboardsSection } from "@/features/leaderboards";
import { TracksSection } from "@/features/tracks";
import { isLoggedIn } from "@/shared/session/mock-session";
import { Hero } from "./hero";

export function HomeView() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-6 md:px-12">
      <Hero />
      <ActivityTicker />
      {isLoggedIn && <GarageBar />}
      <LeaderboardsSection />
      <TracksSection />
    </main>
  );
}
