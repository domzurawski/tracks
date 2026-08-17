"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { createTrack, updateTrack } from "../../model/actions";
import { trackSchema } from "../../model/schema";
import type { TrackInput } from "../../model/schema";
import type { Track } from "../../model/types";

type TrackFormDialogProps = { mode: "create" } | { mode: "edit"; track: Track };

const inputClasses =
  "border border-divider bg-background px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2";

function defaultValues(props: TrackFormDialogProps): TrackInput {
  if (props.mode === "edit") {
    return {
      name: props.track.name,
      country: props.track.country,
      length: props.track.length,
      corners: props.track.corners,
      elevation: props.track.elevation ?? "",
    };
  }

  return { name: "", country: "", length: 0, corners: 0, elevation: "" };
}

export function TrackFormDialog(props: TrackFormDialogProps) {
  const uid = useId();
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrackInput>({
    resolver: zodResolver(trackSchema) as Resolver<TrackInput>,
    defaultValues: defaultValues(props),
  });

  const onSubmit = handleSubmit(async (data) => {
    const result =
      props.mode === "edit"
        ? await updateTrack(props.track.id, data)
        : await createTrack(data);

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
            Add track
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
            {props.mode === "edit" ? "Edit track" : "Add a track"}
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-name`} className="text-sm font-semibold">
              Name
            </label>
            <input
              id={`${uid}-name`}
              className={inputClasses}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-accent-600">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-country`} className="text-sm font-semibold">
              Country
            </label>
            <input
              id={`${uid}-country`}
              className={inputClasses}
              {...register("country")}
            />
            {errors.country && (
              <p className="text-sm text-accent-600">
                {errors.country.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-length`} className="text-sm font-semibold">
              Length (meters)
            </label>
            <input
              id={`${uid}-length`}
              type="number"
              className={inputClasses}
              {...register("length", { valueAsNumber: true })}
            />
            {errors.length && (
              <p className="text-sm text-accent-600">{errors.length.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-corners`} className="text-sm font-semibold">
              Corners
            </label>
            <input
              id={`${uid}-corners`}
              type="number"
              className={inputClasses}
              {...register("corners", { valueAsNumber: true })}
            />
            {errors.corners && (
              <p className="text-sm text-accent-600">
                {errors.corners.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${uid}-elevation`}
              className="text-sm font-semibold"
            >
              Elevation (meters, optional)
            </label>
            <input
              id={`${uid}-elevation`}
              type="number"
              className={inputClasses}
              {...register("elevation")}
            />
            {errors.elevation && (
              <p className="text-sm text-accent-600">
                {errors.elevation.message}
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
              {props.mode === "edit" ? "Save" : "Add track"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
