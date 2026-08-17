import { TrackAdminRow } from "./track-admin-row";
import type { Track } from "../../model/types";

export function TrackAdminList({ tracks }: { tracks: Track[] }) {
  if (tracks.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        No tracks yet — add the first one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tracks.map((track) => (
        <TrackAdminRow key={track.id} track={track} />
      ))}
    </div>
  );
}
