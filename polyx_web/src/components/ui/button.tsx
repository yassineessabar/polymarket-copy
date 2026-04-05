"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ButtonProps {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  type?: "button" | "submit";
}

const variants = {
  primary: "bg-[var(--color-primary)] hover:bg-[#262626] text-white",
  outline: "border border-black/[0.08] text-[var(--color-primary)] hover:bg-[var(--color-surface)]",
  ghost: "text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]",
  danger: "border border-[var(--color-negative)]/30 text-[var(--color-negative)] hover:bg-[var(--color-negative)]/5",
};

const sizes = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  fullWidth,
  href,
  onClick,
  className,
  children,
  type = "button",
}: ButtonProps) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150",
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    (disabled || loading) && "opacity-50 cursor-not-allowed",
    className
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={cls}>
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
