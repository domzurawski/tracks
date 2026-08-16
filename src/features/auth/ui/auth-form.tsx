"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Button } from "@/shared/ui";
import { login, signup } from "../model/actions";
import { loginSchema, signupSchema } from "../model/schema";

type AuthFormProps = {
  mode: "login" | "signup";
};

type AuthFormValues = {
  name?: string;
  email: string;
  password: string;
};

const inputClasses =
  "border border-divider bg-background px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2";

export function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const schema = isSignup ? signupSchema : loginSchema;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema) as Resolver<AuthFormValues>,
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = isSignup
      ? await signup({
          name: data.name ?? "",
          email: data.email,
          password: data.password,
        })
      : await login({ email: data.email, password: data.password });

    if (!result) return;

    if (result.fieldErrors) {
      (Object.keys(result.fieldErrors) as (keyof typeof result.fieldErrors)[]).forEach(
        (field) => {
          const message = result.fieldErrors?.[field];
          if (message) setError(field, { message });
        },
      );
    }

    if (result.rootError) {
      setError("root", { message: result.rootError });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {isSignup && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold">
            Name
          </label>
          <input
            id="name"
            type="text"
            className={inputClasses}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-accent-600">{errors.name.message}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          type="email"
          className={inputClasses}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-accent-600">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold">
          Password
        </label>
        <input
          id="password"
          type="password"
          className={inputClasses}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-accent-600">{errors.password.message}</p>
        )}
      </div>

      {errors.root && (
        <p className="text-sm text-accent-600">{errors.root.message}</p>
      )}

      <Button type="submit" variant="primary" disabled={isSubmitting}>
        {isSignup ? "Sign up" : "Log in"}
      </Button>
    </form>
  );
}
