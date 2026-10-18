import { useMemo } from "react";
import { Board, BoardSkeleton } from "@/components/issues/Board";
import { IssueFilters } from "@/components/issues/IssueFilters";
import { Button, EmptyState, Kbd, PageHeader } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useIssueUI } from "@/context/IssueUIContext";
import { useIssues } from "@/context/IssuesContext";
import { usePlanning } from "@/context/PlanningContext";
import { useProject } from "@/context/ProjectContext";
import { applyIssueFilters, useIssueFilters } from "@/hooks/useIssueFilters";
import { toISODate } from "@/utils/format";

export default function BoardPage() {
  const { user } = useAuth();
  const { current, can } = useProject();
  const { issues, status, error, reload, moveIssue } = useIssues();
  const { activeSprint } = usePlanning();
  const { openCreate, openIssue } = useIssueUI();
  const f = useIssueFilters();

  const filtered = useMemo(() => applyIssueFilters(issues, f.filters, { meId: user.id, todayISO: toISODate(), activeSprintId: activeSprint?.id }), [issues, f.filters, user.id, activeSprint?.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        eyebrow={`Проекты / ${current.name}`}
        title={`Доска ${current.key}`}
        actions={
          can.edit && (
            <Button variant="primary" iconBefore="plus" onClick={() => openCreate()}>
              Создать задачу
            </Button>
          )
        }
      />

      {status === "loading" && <BoardSkeleton />}

      {status === "error" && (
        <EmptyState role="alert" tone="danger" icon="alert" title="Не удалось загрузить задачи" action={<Button variant="primary" onClick={reload}>Повторить</Button>}>
          {error}
        </EmptyState>
      )}

      {status === "ready" && issues.length === 0 && (
        <EmptyState
          icon="board"
          title="На доске пока нет задач"
          action={
            <Button variant="primary" iconBefore="plus" onClick={() => openCreate()}>
              Создать первую задачу
            </Button>
          }
        >
          Задачи появятся в колонках по статусу. Создать задачу можно и клавишей <Kbd>C</Kbd>.
        </EmptyState>
      )}

      {status === "ready" && issues.length > 0 && (
        <>
          <IssueFilters {...f} resultCount={filtered.length} totalCount={issues.length} />
          {filtered.length === 0 ? (
            <EmptyState icon="search" title="Задачи не найдены" action={<Button onClick={f.reset}>Сбросить фильтры</Button>}>
              Измените условия поиска или сбросьте фильтры.
            </EmptyState>
          ) : (
            <Board issues={filtered} onOpen={openIssue} onMove={moveIssue} onCreateIn={(s) => openCreate({ status: s })} />
          )}
        </>
      )}
    </div>
  );
}
