import { mockTracks } from "../model/mock";
import { TrackCard } from "./track-card";

export function TracksSection() {
  return (
    <section className="flex flex-col gap-7 py-14">
      <div className="flex items-baseline justify-between border-b-2 border-divider pb-4">
        <h2 className="font-heading text-3xl font-extrabold">Tracks</h2>
        <span className="text-sm text-foreground/60">
          {mockTracks.length} circuits
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {mockTracks.map((track) => (
          <TrackCard key={track.name} track={track} />
        ))}
      </div>
    </section>
  );
}
