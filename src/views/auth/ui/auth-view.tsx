import Link from "next/link";
import { AuthForm } from "@/features/auth";

type AuthViewProps = {
  mode: "login" | "signup";
};

export function AuthView({ mode }: AuthViewProps) {
  const isSignup = mode === "signup";

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-16 md:px-12">
      <h1 className="font-heading text-2xl font-extrabold">
        {isSignup ? "Sign up" : "Log in"}
      </h1>
      <AuthForm mode={mode} />
      <p className="text-sm text-foreground/60">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent-500">
              Log in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-accent-500">
              Sign up
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
