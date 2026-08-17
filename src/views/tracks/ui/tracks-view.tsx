import { TracksSection } from "@/features/tracks";

export function TracksView() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-6 md:px-12">
      <h1 className="sr-only">Tracks</h1>
      <TracksSection />
    </main>
  );
}
