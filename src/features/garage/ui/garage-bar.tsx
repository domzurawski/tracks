import { ArrowRight, Car } from "lucide-react";
import { Button } from "@/shared/ui";
import { getCarCount } from "../model/cars";
import { mockGarage } from "../model/mock";

export async function GarageBar({ userId }: { userId: string }) {
  const carCount = await getCarCount(userId);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-6 border-b-2 border-divider py-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-accent-500 text-background">
        <Car className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs tracking-wide text-foreground/55 uppercase">
          Your garage
        </span>
        <span className="text-sm font-semibold">
          {carCount} cars · PB {mockGarage.personalBest} at{" "}
          {mockGarage.personalBestTrack} · Rank #{mockGarage.rank} overall
        </span>
      </div>
      <Button href="/my-garage" variant="ghost" className="ml-auto">
        Manage garage
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
