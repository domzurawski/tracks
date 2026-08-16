import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, AuthView } from "@/views/auth";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create a Tracks Inc. account to log lap times and track your progress.",
};

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return <AuthView mode="signup" />;
}
