import { useState } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { cn } from "@/utils/cn";

export function TrendChart({ points, series, height = 220 }) {
  const [ref, width] = useElementWidth();
  const [active, setActive] = useState(null);

  const pad = { top: 12, right: 24, bottom: 28, left: 32 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const rawMax = Math.max(1, ...points.flatMap((p) => series.map((s) => p.values[s.id] ?? 0)));
  const step = rawMax <= 4 ? 1 : Math.ceil(rawMax / 4);
  const yMax = step * Math.ceil(rawMax / step);
  const ticks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step);

  const x = (i) => (points.length <= 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v) => h - (v / yMax) * h;

  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(w / 64))));

  const onPointer = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - pad.left;
    const i = Math.round((px / w) * (points.length - 1));
    setActive(Math.min(points.length - 1, Math.max(0, i)));
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setActive((a) => {
        const cur = a ?? (e.key === "ArrowRight" ? -1 : points.length);
        return Math.min(points.length - 1, Math.max(0, cur + (e.key === "ArrowRight" ? 1 : -1)));
      });
    } else if (e.key === "Escape") setActive(null);
  };

  const activePoint = active != null ? points[active] : null;
  const tooltipLeft = active != null ? Math.min(Math.max(pad.left + x(active), 70), width - 70) : 0;

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1" aria-label="Легенда">
        {series.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <span aria-hidden="true" className={cn("h-0.5 w-4 rounded-full", s.dotClass, s.dashed && "opacity-60")} />
            {s.label}
          </li>
        ))}
      </ul>

      <div ref={ref} className="relative">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="График по дням. Стрелками влево и вправо можно переходить между днями."
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerMove={onPointer}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          className="block touch-pan-y rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-line-focus"
        >
          <g transform={`translate(${pad.left},${pad.top})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={w} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-line-bold/50" : "stroke-line"} strokeWidth={1} />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-subtlest text-[11px] tabular-nums">
                  {t}
                </text>
              </g>
            ))}

            {points.map(
              (p, i) =>
                (i % labelEvery === 0 || i === points.length - 1) &&
                !(i !== points.length - 1 && points.length - 1 - i < labelEvery) && (
                  <text
                    key={i}
                    x={x(i)}
                    y={h + 18}
                    textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                    className="fill-ink-subtlest text-[11px]"
                  >
                    {p.label}
                  </text>
                )
            )}

            {active != null && <line x1={x(active)} x2={x(active)} y1={0} y2={h} className="stroke-line-bold" strokeWidth={1} strokeDasharray="3 3" />}

            {series.map((s) => (
              <g key={s.id}>
                <polyline
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray={s.dashed ? "5 4" : undefined}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className={s.strokeClass}
                  points={points
                    .map((p, i) => (p.values[s.id] === null ? null : `${x(i)},${y(p.values[s.id] ?? 0)}`))
                    .filter(Boolean)
                    .join(" ")}
                />
                {!s.dashed &&
                  (() => {
                    let last = -1;
                    points.forEach((p, i) => p.values[s.id] !== null && p.values[s.id] !== undefined && (last = i));
                    return last >= 0 && last !== active ? <circle cx={x(last)} cy={y(points[last].values[s.id])} r={3.5} className={cn(s.strokeClass, "fill-surface-raised")} strokeWidth={2} /> : null;
                  })()}
                {active != null && points[active].values[s.id] !== null && (
                  <circle
                    cx={x(active)}
                    cy={y(points[active].values[s.id] ?? 0)}
                    r={4.5}
                    strokeWidth={2}
                    className={cn(s.strokeClass, "fill-surface-raised")}
                  />
                )}
              </g>
            ))}
          </g>
        </svg>

        {activePoint && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 min-w-[128px] -translate-x-1/2 rounded-md bg-surface-overlay px-3 py-2 text-xs shadow-overlay"
            style={{ left: tooltipLeft }}
          >
            <p className="font-semibold text-ink">{activePoint.label}</p>
            {series.map((s) => (
              <p key={s.id} className="mt-1 flex items-center gap-2 text-ink-subtle">
                <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", s.dotClass)} />
                <span className="flex-1">{s.label}</span>
                <span className="font-semibold tabular-nums text-ink">{activePoint.values[s.id] === null ? "—" : (activePoint.values[s.id] ?? 0)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
