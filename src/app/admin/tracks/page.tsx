import type { Metadata } from "next";
import { AdminTracksView, requireAdmin } from "@/views/admin-tracks";

export const metadata: Metadata = {
  title: "Manage Tracks",
  description: "Add, edit, and remove tracks on Tracks Inc.",
};

export default async function AdminTracksPage() {
  await requireAdmin();
  return <AdminTracksView />;
}
