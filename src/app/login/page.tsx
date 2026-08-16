import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, AuthView } from "@/views/auth";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Tracks Inc. account.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return <AuthView mode="login" />;
}
