import { Button } from "@/shared/ui";

export function AdminView() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-12">
      <h1 className="font-heading text-2xl font-extrabold">Admin</h1>
      <div className="flex flex-wrap gap-4">
        <Button href="/admin/tracks" variant="secondary">
          Manage tracks
        </Button>
        <Button href="/admin/leaderboards" variant="secondary">
          Manage leaderboards
        </Button>
      </div>
    </main>
  );
}
