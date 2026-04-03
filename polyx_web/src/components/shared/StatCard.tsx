'use client';

import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string;
  change?: number;
  mono?: boolean;
}

export default function StatCard({ label, value, change, mono }: StatCardProps) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-card p-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p
        className={clsx(
          'mt-1 text-xl font-semibold text-text-primary',
          mono && 'font-mono'
        )}
      >
        {value}
      </p>
      {change !== undefined && (
        <p
          className={clsx(
            'mt-1 text-xs font-medium',
            change >= 0 ? 'text-profit' : 'text-loss'
          )}
        >
          {change >= 0 ? '+' : ''}
          {change.toFixed(2)}%
        </p>
      )}
    </div>
  );
}
