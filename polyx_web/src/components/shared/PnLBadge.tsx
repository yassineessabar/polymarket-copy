'use client';

import clsx from 'clsx';

interface PnLBadgeProps {
  amount: number;
  percent?: number;
}

export default function PnLBadge({ amount, percent }: PnLBadgeProps) {
  const positive = amount >= 0;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium font-mono',
        positive
          ? 'bg-profit/10 text-profit'
          : 'bg-loss/10 text-loss'
      )}
    >
      {positive ? '+' : ''}${amount.toFixed(2)}
      {percent !== undefined && (
        <span className="opacity-75">
          ({positive ? '+' : ''}{percent.toFixed(1)}%)
        </span>
      )}
    </span>
  );
}
