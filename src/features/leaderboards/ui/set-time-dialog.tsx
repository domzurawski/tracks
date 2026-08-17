"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Plus } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { createEntry } from "../model/actions";
import { entrySchema } from "../model/schema";
import type { EntryInput } from "../model/schema";

export type CarOption = {
  id: string;
  make: string;
  model: string;
  year: number;
  nickname: string | null;
};

type SetTimeDialogProps = {
  leaderboardId: string;
  cars: CarOption[];
};

const inputClasses =
  "border border-divider bg-background px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2";

function defaultValues(cars: CarOption[]): EntryInput {
  return {
    carId: cars[0]?.id ?? "",
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  };
}

export function SetTimeDialog({ leaderboardId, cars }: SetTimeDialogProps) {
  const uid = useId();
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntryInput>({
    resolver: zodResolver(entrySchema) as Resolver<EntryInput>,
    defaultValues: defaultValues(cars),
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await createEntry(leaderboardId, data);

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
        variant="primary"
        onClick={() => {
          reset(defaultValues(cars));
          setIsOpen(true);
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        Set a time
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex w-80 flex-col gap-4"
        >
          <h2 className="font-heading text-lg font-extrabold">Set a time</h2>
          <p className="text-sm text-foreground/60">
            Your car&apos;s specs and notes will be shown publicly on this
            leaderboard.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-carId`} className="text-sm font-semibold">
              Car
            </label>
            <select
              id={`${uid}-carId`}
              className={inputClasses}
              {...register("carId")}
            >
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.nickname
                    ? `${car.nickname} (${car.year} ${car.make} ${car.model})`
                    : `${car.year} ${car.make} ${car.model}`}
                </option>
              ))}
            </select>
            {errors.carId && (
              <p className="text-sm text-accent-600">
                {errors.carId.message}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label
                htmlFor={`${uid}-minutes`}
                className="text-sm font-semibold"
              >
                Minutes
              </label>
              <input
                id={`${uid}-minutes`}
                type="number"
                className={inputClasses}
                {...register("minutes", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label
                htmlFor={`${uid}-seconds`}
                className="text-sm font-semibold"
              >
                Seconds
              </label>
              <input
                id={`${uid}-seconds`}
                type="number"
                className={inputClasses}
                {...register("seconds", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label
                htmlFor={`${uid}-milliseconds`}
                className="text-sm font-semibold"
              >
                Millis
              </label>
              <input
                id={`${uid}-milliseconds`}
                type="number"
                className={inputClasses}
                {...register("milliseconds", { valueAsNumber: true })}
              />
            </div>
          </div>
          {errors.minutes && (
            <p className="text-sm text-accent-600">
              {errors.minutes.message}
            </p>
          )}
          {errors.seconds && (
            <p className="text-sm text-accent-600">
              {errors.seconds.message}
            </p>
          )}
          {errors.milliseconds && (
            <p className="text-sm text-accent-600">
              {errors.milliseconds.message}
            </p>
          )}

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
              Set time
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
