import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "success" | "danger" | "neutral" | "active";
  children: React.ReactNode;
  className?: string;
}

const variants = {
  success: "bg-[var(--color-positive)]/10 text-[var(--color-positive)]",
  danger: "bg-[var(--color-negative)]/10 text-[var(--color-negative)]",
  neutral: "bg-[var(--color-surface)] text-[var(--color-secondary)]",
  active: "bg-[var(--color-positive)]/10 text-[var(--color-positive)]",
};

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full",
        variants[variant],
        className
      )}
    >
      {variant === "active" && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children}
    </span>
  );
}
