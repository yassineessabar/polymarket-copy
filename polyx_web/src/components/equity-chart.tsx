"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface EquityChartProps {
  data: { date: string; value: number }[];
  height?: number;
  period?: string;
  periods?: string[];
  onPeriodChange?: (period: string) => void;
  positive?: boolean;
}

export function EquityChart({ data, height = 180, period, periods = ["1W", "1M", "3M", "YTD", "ALL"], onPeriodChange, positive = true }: EquityChartProps) {
  const color = positive ? "var(--color-positive)" : "var(--color-negative)";

  return (
    <div>
      {data.length > 1 && (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={positive ? "#10B981" : "#EF4444"} stopOpacity={0.06} />
                  <stop offset="100%" stopColor={positive ? "#10B981" : "#EF4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "12px", color: "var(--color-primary)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "6px 10px" }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, ""]}
                labelFormatter={() => ""}
                cursor={{ stroke: positive ? "#10B981" : "#EF4444", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area type="monotone" dataKey="value" stroke={positive ? "#10B981" : "#EF4444"} strokeWidth={1.5} fill="url(#eqGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {period && onPeriodChange && (
        <div className="flex gap-1 mt-3">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors duration-150 ${
                period === p ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted)] hover:text-[var(--color-secondary)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
