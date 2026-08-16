import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = {
  variant?: ButtonVariant;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

const baseClasses =
  "inline-flex items-center gap-1.5 whitespace-nowrap py-2 font-heading text-sm font-extrabold outline-none transition-colors focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-500 px-4 text-background hover:bg-accent-600 active:bg-accent-700",
  secondary:
    "border border-divider px-4 hover:bg-foreground/5 active:bg-foreground/10",
  ghost: "px-1 text-accent-500 hover:bg-accent-500/10 active:bg-accent-500/20",
};

export function Button({
  variant = "primary",
  href,
  type = "button",
  disabled,
  className,
  children,
}: ButtonProps) {
  const classes = cn(baseClasses, variantClasses[variant], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
