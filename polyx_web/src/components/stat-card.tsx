import { cn } from "@/lib/utils";
import { Card } from "./ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: "positive" | "negative" | "default";
  mono?: boolean;
  className?: string;
}

const colors = {
  positive: "text-[var(--color-positive)]",
  negative: "text-[var(--color-negative)]",
  default: "text-[var(--color-primary)]",
};

export function StatCard({ label, value, color = "default", mono = true, className }: StatCardProps) {
  return (
    <Card padding="md" className={className}>
      <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-[0.05em] font-medium mb-1">{label}</p>
      <p className={cn("text-lg font-bold", mono && "font-mono", colors[color])}>{value}</p>
    </Card>
  );
}
