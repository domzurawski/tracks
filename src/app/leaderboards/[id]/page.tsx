import type { Metadata } from "next";
import {
  getCurrentUser,
  getLeaderboard,
  LeaderboardDetailView,
} from "@/views/leaderboard-detail";

type LeaderboardPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: LeaderboardPageProps): Promise<Metadata> {
  const { id } = await params;
  const leaderboard = await getLeaderboard(id);
  if (!leaderboard) return {};

  return {
    title: leaderboard.title,
    description: `${leaderboard.title} leaderboard for ${leaderboard.trackName} on Tracks Inc.`,
  };
}

export default async function LeaderboardPage(
  props: PageProps<"/leaderboards/[id]">,
) {
  const { id } = await props.params;
  const user = await getCurrentUser();

  return <LeaderboardDetailView leaderboardId={id} user={user} />;
}
