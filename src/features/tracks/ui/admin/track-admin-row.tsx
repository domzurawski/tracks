import { Tag } from "@/shared/ui";
import { TrackFormDialog } from "./track-form-dialog";
import { DeleteTrackButton } from "./delete-track-button";
import type { Track } from "../../model/types";

export function TrackAdminRow({ track }: { track: Track }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-divider p-5">
      <div className="flex flex-col gap-1.5">
        <span className="font-heading text-lg font-extrabold">
          {track.name}
        </span>
        <span className="text-sm text-foreground/60">{track.country}</span>
        <div className="flex flex-wrap gap-2">
          <Tag variant="neutral">{(track.length / 1000).toFixed(1)} km</Tag>
          <Tag variant="neutral">{track.corners} corners</Tag>
          {track.elevation !== null && (
            <Tag variant="neutral">{track.elevation}m elevation</Tag>
          )}
        </div>
      </div>
      <div className="flex gap-2.5">
        <TrackFormDialog mode="edit" track={track} />
        <DeleteTrackButton trackId={track.id} trackName={track.name} />
      </div>
    </div>
  );
}
