import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type TagVariant = "accent" | "neutral" | "outline";

type TagProps = {
  variant?: TagVariant;
  className?: string;
  children: ReactNode;
};

const variantClasses: Record<TagVariant, string> = {
  accent: "bg-accent-100 text-accent-800",
  neutral: "bg-neutral-100 text-neutral-800",
  outline: "border border-accent-500 text-accent-500",
};

export function Tag({ variant = "neutral", className, children }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold tracking-wide",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
