import { useCallback, useState } from "react";
import { Icon } from "@/components/icons";
import { STATUSES } from "@/constants/issues";
import { useIssues } from "@/context/IssuesContext";
import { useTeams } from "@/context/TeamsContext";
import { cn, focusRing } from "@/utils/cn";
import { IssueCard } from "./IssueCard";

export function Board({ issues, onOpen, onMove, onCreateIn }) {
  const { personById } = useTeams();
  const { byId, childrenOf } = useIssues();
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const move = useCallback(
    (id, status, { keepFocus } = {}) => {
      onMove(id, status);
      if (keepFocus) {
        const issue = issues.find((i) => i.id === id);
        requestAnimationFrame(() => document.querySelector(`[data-issue-key="${issue?.key}"]`)?.focus());
      }
    },
    [issues, onMove]
  );

  const endDrag = useCallback(() => {
    setDragId(null);
    setOverCol(null);
  }, []);

  return (
    <div className="-mx-4 flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 scrollbar-thin sm:snap-none md:-mx-6 md:px-6">
      <p id="board-card-hint" className="sr-only">
        Enter — открыть задачу. Alt и стрелка влево или вправо — перенести в соседнюю колонку.
      </p>
      {STATUSES.map((col) => {
        const items = issues.filter((i) => i.status === col.id);
        const isOver = overCol === col.id && dragId != null;
        return (
          <section
            key={col.id}
            aria-labelledby={`col-${col.id}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overCol !== col.id) setOverCol(col.id);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) move(id, col.id);
              endDrag();
            }}
            className={cn(
              "flex max-h-full w-[85vw] max-w-[320px] shrink-0 snap-center flex-col rounded-lg bg-surface-sunken transition-colors duration-fast",
              "sm:w-72 xl:min-w-[240px] xl:max-w-none xl:flex-1",
              isOver && "bg-brand-subtle ring-2 ring-inset ring-brand"
            )}
          >
            <h2 id={`col-${col.id}`} className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", col.dot)} />
              <span className="truncate">{col.label}</span>
              <span className="rounded-full bg-neutral px-1.5 font-semibold normal-case tracking-normal text-ink-subtle">
                <span className="sr-only">задач: </span>
                {items.length}
              </span>
            </h2>

            <ul className="flex min-h-[72px] flex-col gap-2 overflow-y-auto px-2 pb-1 scrollbar-thin">
              {items.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  assignee={issue.assigneeId ? personById[issue.assigneeId] ?? { name: "Удалённый участник", email: issue.assigneeId } : null}
                  parentKey={byId[issue.parentId]?.key}
                  subtasksTotal={childrenOf[issue.id]?.length ?? 0}
                  subtasksDone={childrenOf[issue.id]?.filter((c) => c.status === "done").length ?? 0}
                  onOpen={onOpen}
                  onMove={move}
                  dragging={dragId === issue.id}
                  onDragStart={setDragId}
                  onDragEnd={endDrag}
                />
              ))}
              {items.length === 0 && (
                <li className="grid h-16 place-items-center rounded-md border-2 border-dashed border-line px-2 text-center text-xs text-ink-subtlest">
                  {isOver ? "Отпустите, чтобы перенести сюда" : "Нет задач"}
                </li>
              )}
            </ul>

            <div className="shrink-0 p-2 pt-1">
              <button
                type="button"
                onClick={() => onCreateIn(col.id)}
                className={cn(
                  "flex h-9 w-full items-center gap-2 rounded-sm px-2 text-sm font-medium text-ink-subtle transition-colors duration-fast hover:bg-neutral hover:text-ink",
                  focusRing
                )}
              >
                <Icon name="plus" />
                Создать задачу
                <span className="sr-only">в колонке «{col.label}»</span>
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" role="status" aria-label="Загрузка задач">
      {STATUSES.map((s) => (
        <div key={s.id} className="w-[85vw] max-w-[320px] shrink-0 rounded-lg bg-surface-sunken p-2 sm:w-72 xl:max-w-none xl:flex-1">
          <div className="m-1 mb-3 h-4 w-24 animate-pulse rounded-sm bg-neutral-hover" />
          {[0, 1, 2].map((n) => (
            <div key={n} className="mb-2 h-20 animate-pulse rounded-md bg-neutral" />
          ))}
        </div>
      ))}
    </div>
  );
}
