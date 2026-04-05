import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  noBorder?: boolean;
}

const paddings = { none: "", sm: "p-3", md: "p-4 sm:p-5", lg: "p-5 sm:p-6" };

export function Card({ children, className, padding = "md", noBorder }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--color-card)] rounded-2xl",
        !noBorder && "border border-[var(--color-border)]",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
