import type { AuthUser } from "@/features/auth";

type MyGarageViewProps = {
  user: AuthUser;
};

export function MyGarageView({ user }: MyGarageViewProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-6 py-16 md:px-12">
      <h1 className="font-heading text-2xl font-extrabold">
        {user.name}&apos;s Garage
      </h1>
      <p className="text-sm text-foreground/60">Coming soon.</p>
    </main>
  );
}
