import { useId, useState } from "react";
import { Card, CardHeader } from "@/components/ui";
import { cn, focusRing } from "@/utils/cn";

export function ChartCard({ title, description, table, children, className }) {
  const [view, setView] = useState("chart");
  const titleId = useId();

  return (
    <Card aria-labelledby={titleId} className={cn("flex min-w-0 flex-col", className)}>
      <CardHeader
        id={titleId}
        title={title}
        description={description}
        actions={
          table && (
            <div role="group" aria-label={`Вид: ${title}`} className="flex rounded-sm bg-neutral p-0.5">
              {[
                ["chart", "Диаграмма"],
                ["table", "Таблица"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className={cn(
                    "h-6 rounded-xs px-2 text-xs font-medium transition-colors duration-fast",
                    view === id ? "bg-surface-raised text-ink shadow-raised" : "text-ink-subtle hover:text-ink",
                    focusRing
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )
        }
      />
      <div className="min-w-0 flex-1 px-4 pb-4 pt-3 sm:px-5">
        {view === "chart" || !table ? (
          children
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr className="border-b border-line">
                  {table.columns.map((c, i) => (
                    <th key={c} scope="col" className={cn("py-2 text-xs font-semibold text-ink-subtle", i === 0 ? "text-left" : "text-right")}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row[0]} className="border-b border-line last:border-0">
                    {row.map((cell, i) =>
                      i === 0 ? (
                        <th key={i} scope="row" className="py-2 text-left font-normal text-ink">
                          {cell}
                        </th>
                      ) : (
                        <td key={i} className="py-2 text-right tabular-nums text-ink">
                          {cell}
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
