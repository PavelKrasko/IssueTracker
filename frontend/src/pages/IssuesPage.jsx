import { useMemo } from "react";
import { IssueFilters } from "@/components/issues/IssueFilters";
import { IssueTable } from "@/components/issues/IssueTable";
import { Button, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useIssueUI } from "@/context/IssueUIContext";
import { useIssues } from "@/context/IssuesContext";
import { usePlanning } from "@/context/PlanningContext";
import { applyIssueFilters, useIssueFilters } from "@/hooks/useIssueFilters";
import { countLabel, toISODate } from "@/utils/format";

export default function IssuesPage() {
  const { user } = useAuth();
  const { issues, status, error, reload } = useIssues();
  const { activeSprint } = usePlanning();
  const { openCreate, openIssue, openEdit, requestDelete } = useIssueUI();
  const f = useIssueFilters();

  const filtered = useMemo(() => applyIssueFilters(issues, f.filters, { meId: user.id, todayISO: toISODate(), activeSprintId: activeSprint?.id }), [issues, f.filters, user.id, activeSprint?.id]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Все задачи"
        subtitle={status === "ready" ? countLabel(issues.length, ["задача", "задачи", "задач"]) + " в проекте" : undefined}
        actions={
          <Button variant="primary" iconBefore="plus" onClick={() => openCreate()}>
            Создать задачу
          </Button>
        }
      />

      {status === "loading" && (
        <div className="flex flex-col gap-2" role="status" aria-label="Загрузка задач">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {status === "error" && (
        <EmptyState role="alert" tone="danger" icon="alert" title="Не удалось загрузить задачи" action={<Button variant="primary" onClick={reload}>Повторить</Button>}>
          {error}
        </EmptyState>
      )}

      {status === "ready" && issues.length === 0 && (
        <EmptyState icon="list" title="Задач пока нет" action={<Button variant="primary" iconBefore="plus" onClick={() => openCreate()}>Создать задачу</Button>}>
          Здесь будут все задачи проекта с сортировкой и фильтрами.
        </EmptyState>
      )}

      {status === "ready" && issues.length > 0 && (
        <>
          <IssueFilters {...f} showStatus resultCount={filtered.length} totalCount={issues.length} />
          {filtered.length === 0 ? (
            <EmptyState icon="search" title="Задачи не найдены" action={<Button onClick={f.reset}>Сбросить фильтры</Button>}>
              {f.filters.q ? `По запросу «${f.filters.q}» ничего нет.` : "Под выбранные фильтры не подходит ни одна задача."}
            </EmptyState>
          ) : (
            <IssueTable issues={filtered} onOpen={openIssue} onEdit={openEdit} onDelete={requestDelete} />
          )}
        </>
      )}
    </div>
  );
}
