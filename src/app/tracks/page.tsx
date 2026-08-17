import type { Metadata } from "next";
import { TracksView } from "@/views/tracks";

export const metadata: Metadata = {
  title: "Tracks",
  description: "Browse every track tracked on Tracks Inc.",
};

export default function TracksPage() {
  return <TracksView />;
}
