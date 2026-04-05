import { Card } from "./ui/card";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <Card padding="lg" className="text-center py-12">
      {icon && <div className="flex justify-center mb-4">{icon}</div>}
      <h3 className="font-semibold text-[var(--color-primary)] mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-[var(--color-secondary)] mb-4 max-w-xs mx-auto">{subtitle}</p>}
      {action && <div className="flex justify-center">{action}</div>}
    </Card>
  );
}
