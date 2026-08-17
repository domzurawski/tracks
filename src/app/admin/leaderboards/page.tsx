import type { Metadata } from "next";
import {
  AdminLeaderboardsView,
  requireAdmin,
} from "@/views/admin-leaderboards";

export const metadata: Metadata = {
  title: "Manage Leaderboards",
  description: "Add, edit, and remove leaderboards on Tracks Inc.",
};

export default async function AdminLeaderboardsPage() {
  await requireAdmin();
  return <AdminLeaderboardsView />;
}
