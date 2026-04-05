import { cn } from "@/lib/utils";

interface InputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  prefix?: string;
  suffix?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onKeyDown,
  prefix,
  suffix,
  error,
  className,
  disabled,
  id,
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="text-xs text-[var(--color-secondary)] font-medium mb-1.5 block">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] text-sm">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          disabled={disabled}
          className={cn(
            "w-full h-11 bg-[var(--color-surface)] rounded-xl text-sm text-[var(--color-primary)] outline-none transition-all duration-150",
            "focus:ring-2 focus:ring-black/10",
            prefix ? "pl-8 pr-4" : "px-4",
            suffix && "pr-12",
            error && "ring-2 ring-[var(--color-negative)]/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] text-xs">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-[var(--color-negative)] mt-1">{error}</p>}
    </div>
  );
}
