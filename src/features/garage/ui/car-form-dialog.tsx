"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { createCar, updateCar } from "../model/actions";
import { carSchema } from "../model/schema";
import type { CarInput } from "../model/schema";
import type { Car } from "../model/types";

type CarFormDialogProps = { mode: "create" } | { mode: "edit"; car: Car };

const inputClasses =
  "border border-divider bg-background px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2";

function defaultValues(props: CarFormDialogProps): CarInput {
  if (props.mode === "edit") {
    return {
      make: props.car.make,
      model: props.car.model,
      year: props.car.year,
      horsepower: props.car.horsepower,
      drivetrain: props.car.drivetrain,
      transmission: props.car.transmission,
      nickname: props.car.nickname ?? "",
      photoUrl: props.car.photoUrl ?? "",
      notes: props.car.notes ?? "",
    };
  }

  return {
    make: "",
    model: "",
    year: new Date().getFullYear(),
    horsepower: 0,
    drivetrain: "FWD",
    transmission: "MANUAL",
    nickname: "",
    photoUrl: "",
    notes: "",
  };
}

export function CarFormDialog(props: CarFormDialogProps) {
  const uid = useId();
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CarInput>({
    resolver: zodResolver(carSchema) as Resolver<CarInput>,
    defaultValues: defaultValues(props),
  });

  const onSubmit = handleSubmit(async (data) => {
    const result =
      props.mode === "edit"
        ? await updateCar(props.car.id, data)
        : await createCar(data);

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
            Add car
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
            {props.mode === "edit" ? "Edit car" : "Add a car"}
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-make`} className="text-sm font-semibold">
              Make
            </label>
            <input
              id={`${uid}-make`}
              className={inputClasses}
              {...register("make")}
            />
            {errors.make && (
              <p className="text-sm text-accent-600">{errors.make.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-model`} className="text-sm font-semibold">
              Model
            </label>
            <input
              id={`${uid}-model`}
              className={inputClasses}
              {...register("model")}
            />
            {errors.model && (
              <p className="text-sm text-accent-600">{errors.model.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-year`} className="text-sm font-semibold">
              Year
            </label>
            <input
              id={`${uid}-year`}
              type="number"
              className={inputClasses}
              {...register("year", { valueAsNumber: true })}
            />
            {errors.year && (
              <p className="text-sm text-accent-600">{errors.year.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${uid}-horsepower`}
              className="text-sm font-semibold"
            >
              Horsepower
            </label>
            <input
              id={`${uid}-horsepower`}
              type="number"
              className={inputClasses}
              {...register("horsepower", { valueAsNumber: true })}
            />
            {errors.horsepower && (
              <p className="text-sm text-accent-600">
                {errors.horsepower.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${uid}-drivetrain`}
              className="text-sm font-semibold"
            >
              Drivetrain
            </label>
            <select
              id={`${uid}-drivetrain`}
              className={inputClasses}
              {...register("drivetrain")}
            >
              <option value="FWD">FWD</option>
              <option value="RWD">RWD</option>
              <option value="AWD">AWD</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${uid}-transmission`}
              className="text-sm font-semibold"
            >
              Transmission
            </label>
            <select
              id={`${uid}-transmission`}
              className={inputClasses}
              {...register("transmission")}
            >
              <option value="MANUAL">Manual</option>
              <option value="AUTOMATIC">Automatic</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${uid}-nickname`}
              className="text-sm font-semibold"
            >
              Nickname (optional)
            </label>
            <input
              id={`${uid}-nickname`}
              className={inputClasses}
              {...register("nickname")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${uid}-photoUrl`}
              className="text-sm font-semibold"
            >
              Photo URL (optional)
            </label>
            <input
              id={`${uid}-photoUrl`}
              className={inputClasses}
              {...register("photoUrl")}
            />
            {errors.photoUrl && (
              <p className="text-sm text-accent-600">
                {errors.photoUrl.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-notes`} className="text-sm font-semibold">
              Notes (optional)
            </label>
            <textarea
              id={`${uid}-notes`}
              className={inputClasses}
              rows={3}
              {...register("notes")}
            />
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
              {props.mode === "edit" ? "Save" : "Add car"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
