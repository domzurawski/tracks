import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, MyGarageView } from "@/views/my-garage";

export const metadata: Metadata = {
  title: "My Garage",
  description: "Your personal garage on Tracks Inc.",
};

export default async function MyGaragePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <MyGarageView user={user} />;
}
