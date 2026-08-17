import { getTracks, TrackAdminList, TrackFormDialog } from "@/features/tracks";

export async function AdminTracksView() {
  const tracks = await getTracks();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-extrabold">Manage tracks</h1>
        <TrackFormDialog mode="create" />
      </div>
      <TrackAdminList tracks={tracks} />
    </main>
  );
}
