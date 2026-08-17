import { ArrowRight, Mountain, Ruler } from "lucide-react";
import { Button, Tag } from "@/shared/ui";
import type { Track } from "../model/types";

function formatLength(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatElevation(meters: number): string {
  return `${meters}m`;
}

export function TrackCard({ track }: { track: Track }) {
  return (
    <div className="flex flex-col gap-3.5 border border-divider bg-background p-6">
      <div className="flex h-[180px] items-center justify-center bg-neutral-200" />
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-extrabold">{track.name}</h3>
        <p className="text-sm text-foreground/60">
          {track.country} · {formatLength(track.length)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Tag>
          <Ruler className="h-3 w-3" />
          {track.corners} corners
        </Tag>
        <Tag>
          <Mountain className="h-3 w-3" />
          {formatElevation(track.elevation)} elevation
        </Tag>
      </div>
      <Button href="/leaderboards" variant="ghost" className="mt-0.5">
        See leaderboards
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
