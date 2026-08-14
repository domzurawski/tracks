import type { Metadata } from "next";
import { HomeView } from "@/views/home";

export const metadata: Metadata = {
  title: "Log the lap. Own the record.",
  description:
    "Track your lap times, compare against real drivers, and see exactly where you rank at Nürburgring, Le Mans, and Spa.",
};

export default function Home() {
  return <HomeView />;
}
