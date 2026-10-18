import { useState } from "react";
import { cn } from "@/utils/cn";

export function DonutChart({ data, totalLabel = "всего" }) {
  const [active, setActive] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const size = 180;
  const stroke = 24;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = total > 0 && data.filter((d) => d.value > 0).length > 1 ? 2 : 0;

  let offset = 0;
  const segments = data.map((d) => {
    const len = total ? (d.value / total) * c : 0;
    const seg = { ...d, len, offset };
    offset += len;
    return seg;
  });

  const activeItem = data.find((d) => d.id === active);
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-neutral" />
          {segments.map(
            (s) =>
              s.len > 0 && (
                <circle
                  key={s.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  strokeWidth={active === s.id ? stroke + 4 : stroke}
                  strokeDasharray={`${Math.max(s.len - gap, 0.5)} ${c - Math.max(s.len - gap, 0.5)}`}
                  strokeDashoffset={-s.offset}
                  className={cn(s.strokeClass, "transition-[stroke-width,opacity] duration-fast", active && active !== s.id && "opacity-40")}
                  onMouseEnter={() => setActive(s.id)}
                  onMouseLeave={() => setActive(null)}
                />
              )
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tabular-nums text-ink">{activeItem ? activeItem.value : total}</span>
          <span className="max-w-[110px] truncate text-xs text-ink-subtle">{activeItem ? activeItem.label : totalLabel}</span>
        </div>
      </div>

      <ul className="flex w-full min-w-0 flex-col gap-1">
        {data.map((d) => (
          <li key={d.id}>
            <div
              tabIndex={0}
              onMouseEnter={() => setActive(d.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(d.id)}
              onBlur={() => setActive(null)}
              className={cn(
                "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-fast",
                active === d.id ? "bg-surface-hovered" : "",
                "focus-visible:ring-2 focus-visible:ring-line-focus"
              )}
            >
              <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-full", d.dotClass)} />
              <span className="min-w-0 flex-1 truncate text-ink">{d.label}</span>
              <span className="tabular-nums font-semibold text-ink">{d.value}</span>
              <span className="w-10 text-right tabular-nums text-ink-subtle">{pct(d.value)}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
