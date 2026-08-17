import Image from "next/image";
import { Car as CarIcon } from "lucide-react";
import { Tag } from "@/shared/ui";
import { CarFormDialog } from "./car-form-dialog";
import { DeleteCarButton } from "./delete-car-button";
import type { Car } from "../model/types";

const drivetrainLabels: Record<Car["drivetrain"], string> = {
  FWD: "FWD",
  RWD: "RWD",
  AWD: "AWD",
};

const transmissionLabels: Record<Car["transmission"], string> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automatic",
};

export function CarCard({ car }: { car: Car }) {
  const label = `${car.year} ${car.make} ${car.model}`;
  const heading = car.nickname || label;
  const subheading = car.nickname ? label : null;

  return (
    <div className="flex flex-col gap-4 border border-divider p-5">
      <div className="relative h-40 w-full overflow-hidden bg-foreground/5">
        {car.photoUrl ? (
          // Photo URLs are arbitrary user-supplied hosts, so we skip Next's
          // image optimizer (which requires an allow-listed domain).
          <Image
            src={car.photoUrl}
            alt={label}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <CarIcon className="h-10 w-10 text-foreground/30" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="font-heading text-lg font-extrabold">{heading}</span>
        {subheading && (
          <span className="text-sm text-foreground/60">{subheading}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Tag variant="neutral">{car.horsepower} hp</Tag>
        <Tag variant="neutral">{drivetrainLabels[car.drivetrain]}</Tag>
        <Tag variant="neutral">{transmissionLabels[car.transmission]}</Tag>
      </div>

      {car.notes && <p className="text-sm text-foreground/70">{car.notes}</p>}

      <div className="mt-auto flex gap-2.5">
        <CarFormDialog mode="edit" car={car} />
        <DeleteCarButton carId={car.id} carLabel={label} />
      </div>
    </div>
  );
}
