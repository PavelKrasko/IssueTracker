import { useEffect, useMemo, useState } from "react";
import { timeReportApi } from "@/api/planningApi";
import { useProject } from "@/context/ProjectContext";
import { formatMinutes } from "@/utils/time";
import { toISODate } from "@/utils/format";
import { BarList } from "@/components/charts/BarList";
import { ChartCard } from "@/components/charts/ChartCard";
import { DonutChart } from "@/components/charts/DonutChart";
import { StatTile } from "@/components/charts/StatTile";
import { TrendChart } from "@/components/charts/TrendChart";
import { PriorityIcon } from "@/components/issues/IssueMeta";
import { Avatar, Button, EmptyState, PageHeader, SelectField, Skeleton } from "@/components/ui";
import { useIssueUI } from "@/context/IssueUIContext";
import { useIssues } from "@/context/IssuesContext";
import { useTeams } from "@/context/TeamsContext";
import { computeStats } from "@/utils/stats";

const PERIODS = [
  { value: "7", label: "7 дней" },
  { value: "14", label: "14 дней" },
  { value: "30", label: "30 дней" },
];

const TREND_SERIES = [
  { id: "created", label: "Создано", strokeClass: "stroke-chart-1", dotClass: "bg-chart-1" },
  { id: "done", label: "Выполнено", strokeClass: "stroke-chart-4", dotClass: "bg-chart-4" },
];

export default function StatsPage() {
  const { issues, status, error, reload } = useIssues();
  const { teams, personById } = useTeams();
  const { openCreate } = useIssueUI();
  const [teamId, setTeamId] = useState("");
  const [period, setPeriod] = useState("14");

  const { current } = useProject();
  const [time, setTime] = useState(null);
  useEffect(() => {
    let alive = true;
    const d = new Date();
    d.setDate(d.getDate() - Number(period) + 1);
    timeReportApi(current.id, { from: toISODate(d), to: toISODate() })
      .then((r) => alive && setTime(r.rows))
      .catch(() => alive && setTime([]));
    return () => {
      alive = false;
    };
  }, [current.id, period, issues]);
  const timeByPerson = useMemo(() => {
    const map = {};
    for (const r of time ?? []) map[r.userId ?? "none"] = (map[r.userId ?? "none"] ?? 0) + r.minutes;
    return Object.entries(map)
      .map(([id, minutes]) => ({ id, minutes, person: personById[id] }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [time, personById]);
  const timeTotal = timeByPerson.reduce((n, x) => n + x.minutes, 0);

  const scoped = useMemo(() => (teamId ? issues.filter((i) => (teamId === "none" ? !i.teamId : i.teamId === teamId)) : issues), [issues, teamId]);
  const s = useMemo(() => computeStats(scoped, { days: Number(period), personById }), [scoped, period, personById]);

  const filters = (
    <div className="flex flex-wrap items-end gap-2">
      {teams.length > 0 && (
        <SelectField
          label="Команда"
          size="sm"
          className="w-48"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          placeholder="Все команды"
          options={[{ value: "none", label: "Без команды" }, ...teams.map((t) => ({ value: t.id, label: t.name }))]}
        />
      )}
      <SelectField label="Период" size="sm" className="w-32" value={period} onChange={(e) => setPeriod(e.target.value)} options={PERIODS} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Статистика" subtitle="Как идут дела в проекте" actions={status === "ready" && issues.length > 0 ? filters : null} />

      {status === "loading" && (
        <div role="status" aria-label="Загрузка статистики" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {status === "error" && (
        <EmptyState role="alert" tone="danger" icon="alert" title="Не удалось загрузить данные" action={<Button variant="primary" onClick={reload}>Повторить</Button>}>
          {error}
        </EmptyState>
      )}

      {status === "ready" && issues.length === 0 && (
        <EmptyState icon="chart" title="Пока нечего считать" action={<Button variant="primary" iconBefore="plus" onClick={() => openCreate()}>Создать задачу</Button>}>
          Диаграммы появятся, когда в проекте будут задачи.
        </EmptyState>
      )}

      {status === "ready" && issues.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Всего задач" value={s.total} icon="list" tone="neutral" hint={`Открыто: ${s.open}`} />
            <StatTile label="В работе и на проверке" value={s.inProgress} icon="clock" tone="brand" />
            <StatTile label="Выполнено" value={`${s.completion}%`} icon="checkCircle" tone="success" hint={`${s.done} из ${s.total}`} />
            <StatTile label="Просрочено" value={s.overdue} icon="alert" tone={s.overdue ? "danger" : "neutral"} hint={s.overdue ? "Срок прошёл, задача не закрыта" : "Всё в срок"} />
          </div>

          {scoped.length === 0 ? (
            <EmptyState compact icon="filter" title="В выбранной команде нет задач" action={<Button onClick={() => setTeamId("")}>Показать все команды</Button>} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="Задачи по статусам"
                description="Доля задач в каждой колонке доски"
                table={{ columns: ["Статус", "Задач"], rows: s.byStatus.map((d) => [d.label, d.value]) }}
              >
                <DonutChart data={s.byStatus} totalLabel="задач" />
              </ChartCard>

              <ChartCard
                title="Открытые задачи по приоритету"
                description="Без учёта задач в «Готово»"
                table={{ columns: ["Приоритет", "Задач"], rows: s.byPriority.map((d) => [d.label, d.value]) }}
              >
                <BarList data={s.byPriority.map((d) => ({ ...d, icon: <PriorityIcon priority={d.id} /> }))} />
              </ChartCard>

              <ChartCard
                title="Создано и выполнено по дням"
                description={`За последние ${PERIODS.find((p) => p.value === period).label}`}
                className="lg:col-span-2"
                table={{ columns: ["День", "Создано", "Выполнено"], rows: s.trend.map((d) => [d.label, d.values.created, d.values.done]) }}
              >
                <TrendChart points={s.trend} series={TREND_SERIES} />
              </ChartCard>

              <ChartCard
                title="Нагрузка на исполнителей"
                description="Открытые задачи на человека"
                className="lg:col-span-2"
                table={{ columns: ["Исполнитель", "Открытых задач"], rows: s.workload.map((w) => [w.person?.name ?? "Не назначено", w.value]) }}
              >
                <BarList
                  emptyLabel="Все задачи выполнены"
                  data={s.workload.map((w) => ({
                    id: w.id,
                    value: w.value,
                    label: w.person?.name ?? "Не назначено",
                    icon: <Avatar person={w.person} size="xs" decorative />,
                  }))}
                />
              </ChartCard>

              <ChartCard
                title="Учёт времени"
                description={`Списано за ${PERIODS.find((p) => p.value === period).label}: ${formatMinutes(timeTotal)} (по всему проекту)`}
                className="lg:col-span-2"
                table={{ columns: ["Участник", "Списано"], rows: timeByPerson.map((t) => [t.person?.name ?? "Удалённый участник", formatMinutes(t.minutes)]) }}
              >
                {time === null ? (
                  <Skeleton className="h-24" />
                ) : (
                  <BarList
                    barClass="bg-chart-2"
                    emptyLabel="За этот период время не списывали. Откройте задачу → «Учёт времени» → «Списать время»."
                    formatValue={formatMinutes}
                    data={timeByPerson.map((t) => ({
                      id: t.id,
                      value: t.minutes,
                      label: t.person?.name ?? "Удалённый участник",
                      icon: <Avatar person={t.person} size="xs" decorative />,
                    }))}
                  />
                )}
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}
