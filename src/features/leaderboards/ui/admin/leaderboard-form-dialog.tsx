"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { createLeaderboard, updateLeaderboard } from "../../model/actions";
import { leaderboardSchema } from "../../model/schema";
import type { LeaderboardInput } from "../../model/schema";
import type { Leaderboard } from "../../model/types";

export type TrackOption = { id: string; name: string };

type LeaderboardFormDialogProps =
  | { mode: "create"; tracks: TrackOption[] }
  | { mode: "edit"; leaderboard: Leaderboard; tracks: TrackOption[] };

const inputClasses =
  "border border-divider bg-background px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2";

function defaultValues(props: LeaderboardFormDialogProps): LeaderboardInput {
  if (props.mode === "edit") {
    return {
      title: props.leaderboard.title,
      trackId: props.leaderboard.trackId,
    };
  }

  return { title: "", trackId: props.tracks[0]?.id ?? "" };
}

export function LeaderboardFormDialog(props: LeaderboardFormDialogProps) {
  const uid = useId();
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaderboardInput>({
    resolver: zodResolver(leaderboardSchema) as Resolver<LeaderboardInput>,
    defaultValues: defaultValues(props),
  });

  const onSubmit = handleSubmit(async (data) => {
    const result =
      props.mode === "edit"
        ? await updateLeaderboard(props.leaderboard.id, data)
        : await createLeaderboard(data);

    if (!result) {
      setIsOpen(false);
      return;
    }

    if (result.fieldErrors) {
      (
        Object.keys(result.fieldErrors) as (keyof typeof result.fieldErrors)[]
      ).forEach((field) => {
        const message = result.fieldErrors?.[field];
        if (message) setError(field, { message });
      });
    }

    if (result.rootError) {
      setError("root", { message: result.rootError });
    }
  });

  return (
    <>
      <Button
        type="button"
        variant={props.mode === "edit" ? "secondary" : "primary"}
        onClick={() => {
          reset(defaultValues(props));
          setIsOpen(true);
        }}
      >
        {props.mode === "edit" ? (
          <>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            Add leaderboard
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex w-80 flex-col gap-4"
        >
          <h2 className="font-heading text-lg font-extrabold">
            {props.mode === "edit" ? "Edit leaderboard" : "Add a leaderboard"}
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-title`} className="text-sm font-semibold">
              Title
            </label>
            <input
              id={`${uid}-title`}
              className={inputClasses}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-accent-600">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-trackId`} className="text-sm font-semibold">
              Track
            </label>
            <select
              id={`${uid}-trackId`}
              className={inputClasses}
              {...register("trackId")}
            >
              {props.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
            {errors.trackId && (
              <p className="text-sm text-accent-600">
                {errors.trackId.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-accent-600">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {props.mode === "edit" ? "Save" : "Add leaderboard"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
