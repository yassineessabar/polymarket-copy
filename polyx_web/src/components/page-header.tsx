import Link from "next/link";
import { IconArrowLeft } from "./ui/icons";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, backHref, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link href={backHref} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--color-surface)] transition-colors">
            <IconArrowLeft size={18} />
          </Link>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-primary)]">{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
