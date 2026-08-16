import { CarCard } from "./car-card";
import type { Car } from "../model/types";

export function CarList({ cars }: { cars: Car[] }) {
  if (cars.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        No cars yet — add your first one.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  );
}
