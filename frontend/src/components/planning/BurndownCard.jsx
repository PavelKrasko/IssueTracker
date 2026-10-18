import { useEffect, useState } from "react";
import { sprintsApi } from "@/api/planningApi";
import { ChartCard } from "@/components/charts/ChartCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { Skeleton } from "@/components/ui";
import { useProject } from "@/context/ProjectContext";
import { formatDate } from "@/utils/format";

export function BurndownCard({ sprint, version }) {
  const { current } = useProject();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    sprintsApi
      .burndown(current.id, sprint.id)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [current.id, sprint.id, version]);

  const unit = data?.unit === "points" ? "story points" : "задачи";
  const points = (data?.days ?? []).map((d) => ({
    label: formatDate(d.date),
    values: { remaining: d.remaining, ideal: Math.round(d.ideal * 100) / 100 },
  }));

  return (
    <ChartCard
      title="График сгорания (burndown)"
      description={data ? `Осталось работы, ${unit}. Всего: ${data.total}` : "Сколько работы осталось на конец каждого дня"}
      table={data && { columns: ["День", "Осталось", "Идеально"], rows: points.map((p) => [p.label, p.values.remaining ?? "—", p.values.ideal]) }}
    >
      {error ? (
        <p className="text-sm text-danger-text">{error}</p>
      ) : !data ? (
        <Skeleton className="h-[220px]" />
      ) : data.total === 0 ? (
        <p className="py-10 text-center text-sm text-ink-subtle">Добавьте в спринт задачи — здесь появится график.</p>
      ) : (
        <TrendChart
          points={points}
          series={[
            { id: "remaining", label: "Осталось", strokeClass: "stroke-chart-2", dotClass: "bg-chart-2" },
            { id: "ideal", label: "Идеальный темп", strokeClass: "stroke-ink-subtlest", dotClass: "bg-ink-subtlest", dashed: true },
          ]}
        />
      )}
    </ChartCard>
  );
}
