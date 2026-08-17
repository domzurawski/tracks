import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import type { AuthUser } from "@/features/auth";
import { getCars } from "@/features/garage";
import {
  EntryTable,
  SetTimeDialog,
  getEntries,
  getLeaderboard,
} from "@/features/leaderboards";
import { Button } from "@/shared/ui";

type LeaderboardDetailViewProps = {
  leaderboardId: string;
  user: AuthUser | null;
};

export async function LeaderboardDetailView({
  leaderboardId,
  user,
}: LeaderboardDetailViewProps) {
  const leaderboard = await getLeaderboard(leaderboardId);
  if (!leaderboard) notFound();

  const entries = await getEntries(leaderboardId);
  const cars = user ? await getCars(user.id) : [];

  const enteredCarIds = new Set(
    entries
      .filter((entry) => entry.driverId === user?.id)
      .map((entry) => entry.carId),
  );
  const eligibleCars = cars
    .filter((car) => !enteredCarIds.has(car.id))
    .map(({ id, make, model, year, nickname }) => ({
      id,
      make,
      model,
      year,
      nickname,
    }));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-accent-700 uppercase">
            <MapPin className="h-3 w-3" />
            {leaderboard.trackName}
          </div>
          <h1 className="font-heading text-2xl font-extrabold">
            {leaderboard.title}
          </h1>
        </div>

        {user ? (
          eligibleCars.length > 0 ? (
            <SetTimeDialog
              leaderboardId={leaderboard.id}
              cars={eligibleCars}
            />
          ) : (
            <p className="text-sm text-foreground/60">
              {cars.length === 0
                ? "Add a car in My Garage to set a time."
                : "All your cars already have a time here."}
            </p>
          )
        ) : (
          <Button href="/login" variant="secondary">
            Log in to set a time
          </Button>
        )}
      </div>

      <EntryTable
        entries={entries}
        currentUserId={user?.id ?? null}
        currentUserRole={user?.role ?? null}
      />
    </main>
  );
}
