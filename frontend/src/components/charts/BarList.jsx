import { cn } from "@/utils/cn";

export function BarList({ data, barClass = "bg-chart-1", emptyLabel = "Нет данных", formatValue = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="py-6 text-center text-sm text-ink-subtlest">{emptyLabel}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.id} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,11rem)_1fr_auto]" title={d.hint}>
          <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
            {d.icon}
            <span className="truncate">{d.label}</span>
          </span>
          <span className="relative h-3 rounded-full" aria-hidden="true">
            <span className="absolute inset-y-0 left-0 right-0 rounded-full bg-neutral" />
            <span
              className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-slower", barClass)}
              style={{ width: d.value ? `max(${(d.value / max) * 100}%, 6px)` : 0 }}
            />
          </span>
          <span className="min-w-8 text-right text-sm font-semibold tabular-nums text-ink">{formatValue(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}
