import { Tag } from "@/shared/ui";
import { DeleteEntryButton } from "./delete-entry-button";
import { EntryNotesButton } from "./entry-notes-button";
import type { LeaderboardEntry } from "../model/types";

const drivetrainLabels: Record<LeaderboardEntry["carDrivetrain"], string> = {
  FWD: "FWD",
  RWD: "RWD",
  AWD: "AWD",
};

const transmissionLabels: Record<
  LeaderboardEntry["carTransmission"],
  string
> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automatic",
};

function formatTime(timeMs: number): string {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const milliseconds = timeMs % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(
    milliseconds,
  ).padStart(3, "0")}`;
}

type EntryTableProps = {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
  currentUserRole: "USER" | "ADMIN" | null;
};

export function EntryTable({
  entries,
  currentUserId,
  currentUserRole,
}: EntryTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        No times set yet — be the first.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b-2 border-divider text-xs font-extrabold tracking-wide text-foreground/60 uppercase">
          <th className="py-3 pr-4">Rank</th>
          <th className="py-3 pr-4">Driver</th>
          <th className="py-3 pr-4">Car</th>
          <th className="py-3 pr-4">Time</th>
          <th className="py-3 pr-4" />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => {
          const carLabel = `${entry.carYear} ${entry.carMake} ${entry.carModel}`;
          const canDelete =
            currentUserId === entry.driverId || currentUserRole === "ADMIN";

          return (
            <tr key={entry.id} className="border-b border-divider">
              <td className="py-3 pr-4 font-heading font-extrabold">
                {index + 1}
              </td>
              <td className="py-3 pr-4">{entry.driverName}</td>
              <td className="py-3 pr-4">
                <div className="flex flex-col gap-1.5">
                  <span>
                    {entry.carNickname
                      ? `${entry.carNickname} (${carLabel})`
                      : carLabel}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag variant="neutral">{entry.carHorsepower} hp</Tag>
                    <Tag variant="neutral">
                      {drivetrainLabels[entry.carDrivetrain]}
                    </Tag>
                    <Tag variant="neutral">
                      {transmissionLabels[entry.carTransmission]}
                    </Tag>
                    {entry.carNotes && (
                      <EntryNotesButton notes={entry.carNotes} />
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4 font-heading font-extrabold">
                {formatTime(entry.timeMs)}
              </td>
              <td className="py-3 pr-4">
                {canDelete && (
                  <DeleteEntryButton entryId={entry.id} carLabel={carLabel} />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
