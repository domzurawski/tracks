import type { AuthUser } from "@/features/auth";
import { CarFormDialog, CarList, getCars } from "@/features/garage";

type MyGarageViewProps = {
  user: AuthUser;
};

export async function MyGarageView({ user }: MyGarageViewProps) {
  const cars = await getCars(user.id);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-extrabold">
          {user.name}&apos;s Garage
        </h1>
        <CarFormDialog mode="create" />
      </div>
      <CarList cars={cars} />
    </main>
  );
}
