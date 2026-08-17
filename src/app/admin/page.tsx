import type { Metadata } from "next";
import { AdminView, requireAdmin } from "@/views/admin";

export const metadata: Metadata = {
  title: "Admin",
  description: "Manage tracks and leaderboards on Tracks Inc.",
};

export default async function AdminPage() {
  await requireAdmin();
  return <AdminView />;
}
