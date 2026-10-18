import { useMemo, useRef } from "react";
import { Icon } from "@/components/icons";
import { IssueFilters } from "@/components/issues/IssueFilters";
import { StatusLozenge } from "@/components/ui";
import { TypeIcon } from "@/components/issues/IssueMeta";
import { Timeline } from "@/components/timeline/Timeline";
import { issueSpan, MODES } from "@/components/timeline/timelineScale";
import { Button, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { STATUSES } from "@/constants/issues";
import { useAuth } from "@/context/AuthContext";
import { useIssueUI } from "@/context/IssueUIContext";
import { useIssues } from "@/context/IssuesContext";
import { usePlanning } from "@/context/PlanningContext";
import { useProject } from "@/context/ProjectContext";
import { useToast } from "@/context/ToastContext";
import { applyIssueFilters, useIssueFilters } from "@/hooks/useIssueFilters";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn, focusRing } from "@/utils/cn";
import { addDaysISO } from "@/utils/dates";
import { formatDate, toISODate } from "@/utils/format";

export default function TimelinePage() {
  const { user } = useAuth();
  const { current } = useProject();
  const { issues, status, error, reload, updateIssue } = useIssues();
  const { activeSprint } = usePlanning();
  const { openCreate, openIssue } = useIssueUI();
  const toast = useToast();
  const f = useIssueFilters();
  const [mode, setMode] = useLocalStorage("it_timeline_mode", "months");
  const timelineRef = useRef(null);

  const filtered = useMemo(() => applyIssueFilters(issues, f.filters, { meId: user.id, todayISO: toISODate(), activeSprintId: activeSprint?.id }), [issues, f.filters, user.id, activeSprint?.id]);

  const { scheduled, unscheduled } = useMemo(() => {
    const withSpan = filtered.map((i) => ({ ...i, span: issueSpan(i) }));
    return {
      scheduled: withSpan.filter((i) => i.span).sort((a, b) => a.span.start.localeCompare(b.span.start) || a.key.localeCompare(b.key, "ru", { numeric: true })),
      unscheduled: withSpan.filter((i) => !i.span),
    };
  }, [filtered]);

  const changeDates = async (issue, dates) => {
    try {
      const updated = await updateIssue(issue.id, dates);
      toast(`${updated.key}: ${formatDate(dates.startDate)} – ${formatDate(dates.dueDate)}`);
    } catch (e) {
      toast(`Не удалось изменить даты ${issue.key}. ${e.message}`, { tone: "error" });
    }
  };

  const schedule = (issue) => {
    const start = toISODate();
    changeDates(issue, { startDate: start, dueDate: addDaysISO(start, 6) });
  };

  const modeSwitch = (
    <div role="group" aria-label="Масштаб" className="flex rounded-sm bg-neutral p-0.5">
      {Object.entries(MODES).map(([id, m]) => (
        <button
          key={id}
          type="button"
          aria-pressed={mode === id}
          onClick={() => setMode(id)}
          className={cn(
            "h-7 rounded-xs px-3 text-sm font-medium transition-colors duration-fast",
            mode === id ? "bg-surface-raised text-ink-brand shadow-raised" : "text-ink-subtle hover:text-ink",
            focusRing
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={`Проекты / ${current.name}`}
        title="Хронология"
        actions={
          <Button variant="primary" iconBefore="plus" onClick={() => openCreate({ startDate: toISODate(), dueDate: addDaysISO(toISODate(), 6) })}>
            Создать задачу
          </Button>
        }
      />

      {status === "loading" && <Skeleton className="h-[420px] w-full" />}

      {status === "error" && (
        <EmptyState role="alert" tone="danger" icon="alert" title="Не удалось загрузить задачи" action={<Button variant="primary" onClick={reload}>Повторить</Button>}>
          {error}
        </EmptyState>
      )}

      {status === "ready" && issues.length === 0 && (
        <EmptyState icon="timeline" title="Пока нечего показать на шкале" action={<Button variant="primary" iconBefore="plus" onClick={() => openCreate({ startDate: toISODate(), dueDate: addDaysISO(toISODate(), 6) })}>Создать задачу</Button>}>
          Укажите у задачи дату начала и срок — она появится здесь полосой.
        </EmptyState>
      )}

      {status === "ready" && issues.length > 0 && (
        <>
          <IssueFilters {...f} showStatus resultCount={filtered.length} totalCount={issues.length} />

          <div className="flex flex-wrap items-center gap-2">
            {modeSwitch}
            <Button variant="outline" iconBefore="crosshair" onClick={() => timelineRef.current?.scrollToToday()} disabled={!scheduled.length}>
              Сегодня
            </Button>
            <ul className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Цвета статусов">
              {STATUSES.map((s) => (
                <li key={s.id} className="flex items-center gap-1.5 text-xs text-ink-subtle">
                  <span aria-hidden="true" className={cn("h-2.5 w-4 rounded-xs", s.dot)} />
                  {s.label}
                </li>
              ))}
              <li className="flex items-center gap-1.5 text-xs text-ink-subtle">
                <span aria-hidden="true" className="h-2.5 w-4 rounded-xs ring-2 ring-danger" />
                Просрочено
              </li>
            </ul>
          </div>

          {scheduled.length > 0 ? (
            <Timeline ref={timelineRef} issues={scheduled} mode={mode} onOpen={openIssue} onChangeDates={changeDates} />
          ) : (
            <EmptyState compact icon="calendarRange" title={filtered.length ? "У задач нет дат" : "Задачи не найдены"}>
              {filtered.length ? "Запланируйте задачи из списка ниже — они появятся на шкале." : "Измените условия поиска или сбросьте фильтры."}
            </EmptyState>
          )}

          {unscheduled.length > 0 && (
            <section aria-labelledby="unscheduled" className="rounded-lg border border-line">
              <h2 id="unscheduled" className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold text-ink">
                <Icon name="calendar" className="h-4 w-4 text-ink-subtle" />
                Без дат
                <span className="rounded-full bg-neutral px-1.5 text-xs text-ink-subtle">{unscheduled.length}</span>
              </h2>
              <ul className="divide-y divide-line">
                {unscheduled.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
                    <TypeIcon type={i.type} />
                    <button type="button" data-issue-key={i.key} onClick={() => openIssue(i.key)} className={cn("flex min-w-0 flex-1 items-baseline gap-2 rounded-sm text-left", focusRing)}>
                      <span className="shrink-0 text-xs font-semibold text-ink-subtle">{i.key}</span>
                      <span className="truncate text-sm text-ink hover:underline">{i.title}</span>
                    </button>
                    <StatusLozenge status={i.status} />
                    <Button size="sm" variant="default" iconBefore="calendarRange" onClick={() => schedule(i)}>
                      Запланировать на неделю
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
