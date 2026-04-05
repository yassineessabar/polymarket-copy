import Link from "next/link";
import { Badge } from "./ui/badge";

interface TraderRowProps {
  name: string;
  image?: string;
  subtitle?: string;
  returnPct?: number;
  status?: "following" | "available";
  href?: string;
  onClick?: () => void;
}

export function TraderRow({ name, image, subtitle, returnPct, status, href, onClick }: TraderRowProps) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--color-surface)] transition-colors cursor-pointer">
      {image ? (
        <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
          <span className="text-lg text-[var(--color-secondary)]">{name.charAt(0)}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-[var(--color-primary)] truncate">{name}</p>
        {subtitle && <p className="text-sm text-[var(--color-secondary)] truncate">{subtitle}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        {returnPct !== undefined && (
          <p className={`text-lg font-bold font-mono ${returnPct >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}>
            {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%
          </p>
        )}
        {status === "following" && <Badge variant="active">Following</Badge>}
        {status === "available" && <span className="text-xs text-[var(--color-positive)] font-medium">Start Following</span>}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block">{content}</Link>;
  if (onClick) return <button onClick={onClick} className="block w-full text-left">{content}</button>;
  return content;
}
