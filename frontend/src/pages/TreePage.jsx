import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "@/components/icons";
import { TypeIcon } from "@/components/issues/IssueMeta";
import { IssueTreeGraph } from "@/components/tree/IssueTreeGraph";
import { Button, Checkbox, EmptyState, PageHeader, PageSpinner, SelectField, StatusLozenge } from "@/components/ui";
import { STATUSES } from "@/constants/issues";
import { useIssueUI } from "@/context/IssueUIContext";
import { useIssues } from "@/context/IssuesContext";
import { useProject } from "@/context/ProjectContext";
import { useTeams } from "@/context/TeamsContext";
import { cn, focusRing } from "@/utils/cn";
import { countLabel } from "@/utils/format";
import { descendants } from "@/utils/planning";

function TreeList({ items, childrenOf, hideDone, onOpen, level = 1 }) {
  return (
    <ul role={level === 1 ? "tree" : "group"} aria-label={level === 1 ? "Иерархия задач" : undefined} className={cn(level > 1 && "ml-5 border-l border-line pl-3")}>
      {items.map((i) => {
        const kids = (childrenOf[i.id] ?? []).filter((c) => !hideDone || c.status !== "done");
        return (
          <li key={i.id} role="treeitem" aria-level={level} aria-expanded={kids.length ? true : undefined} className="py-0.5">
            <button type="button" onClick={() => onOpen(i.key)} className={cn("flex w-full min-w-0 items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-surface-hovered", focusRing)}>
              <TypeIcon type={i.type} />
              <span className={cn("shrink-0 text-xs font-semibold", i.status === "done" ? "text-ink-subtlest line-through" : "text-ink-subtle")}>{i.key}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{i.title}</span>
              <StatusLozenge status={i.status} />
            </button>
            {kids.length > 0 && <TreeList items={kids} childrenOf={childrenOf} hideDone={hideDone} onOpen={onOpen} level={level + 1} />}
          </li>
        );
      })}
    </ul>
  );
}

export default function TreePage() {
  const { issues, byKey, childrenOf, status } = useIssues();
  const { personById } = useTeams();
  const { openIssue, openCreate } = useIssueUI();
  const { can } = useProject();
  const [params, setParams] = useSearchParams();
  const [hideDone, setHideDone] = useState(false);
  const [mode, setMode] = useState("graph");
  const rootKey = params.get("root") ?? "";

  const trees = useMemo(() => issues.filter((i) => !i.parentId && childrenOf[i.id]?.length).sort((a, b) => a.number - b.number), [issues, childrenOf]);
  const roots = useMemo(() => {
    if (rootKey && byKey[rootKey]) return [byKey[rootKey]];
    return trees;
  }, [rootKey, byKey, trees]);

  const total = roots.reduce((n, r) => n + 1 + descendants(r.id, childrenOf).length, 0);

  if (status === "loading") return <PageSpinner label="Загружаем задачи…" />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Иерархия"
        subtitle="Задачи и их подзадачи на одном графе: что из чего состоит и сколько готово"
        actions={
          <div role="group" aria-label="Вид" className="flex rounded-sm bg-neutral p-0.5">
            {[
              ["graph", "Граф", "tree"],
              ["list", "Список", "subtasks"],
            ].map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={cn("flex h-8 items-center gap-1.5 rounded-xs px-3 text-sm font-medium", mode === id ? "bg-surface-raised text-ink shadow-raised" : "text-ink-subtle hover:text-ink", focusRing)}
              >
                <Icon name={icon} />
                {label}
              </button>
            ))}
          </div>
        }
      />

      {trees.length === 0 && !byKey[rootKey] ? (
        <EmptyState
          icon="tree"
          title="Подзадач пока нет"
          action={can.edit && <Button variant="primary" onClick={() => openCreate()}>Создать задачу</Button>}
        >
          Откройте задачу и нажмите «Подзадачи → Добавить», или выберите «Родительскую задачу» в форме — дерево появится здесь.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <SelectField
              label="Дерево"
              value={rootKey}
              onChange={(e) =>
                setParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (e.target.value) next.set("root", e.target.value);
                  else next.delete("root");
                  return next;
                })
              }
              placeholder={`Все деревья (${trees.length})`}
              options={[
                ...trees.map((t) => ({ value: t.key, label: `${t.key} · ${t.title.length > 50 ? `${t.title.slice(0, 49)}…` : t.title}` })),
                ...(rootKey && byKey[rootKey] && !trees.includes(byKey[rootKey]) ? [{ value: rootKey, label: `${rootKey} · ${byKey[rootKey].title}` }] : []),
              ]}
              className="w-full sm:w-80"
            />
            <Checkbox label="Скрыть выполненные" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
            <p className="text-xs text-ink-subtle sm:ml-auto">{countLabel(total, ["задача", "задачи", "задач"])} на графе</p>
          </div>

          <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Цвета статусов">
            {STATUSES.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5 text-xs text-ink-subtle">
                <span aria-hidden="true" className={cn("h-3 w-1.5 rounded-sm", s.dot)} />
                {s.label}
              </li>
            ))}
          </ul>

          {mode === "graph" ? (
            <IssueTreeGraph roots={roots} childrenOf={childrenOf} personById={personById} onOpen={openIssue} hideDone={hideDone} height={Math.max(420, Math.min(720, window.innerHeight - 300))} />
          ) : (
            <div className="rounded-lg border border-line bg-surface-raised p-2">
              <TreeList items={roots} childrenOf={childrenOf} hideDone={hideDone} onOpen={openIssue} />
            </div>
          )}
          <p className="text-xs text-ink-subtlest">Перетаскивайте поле мышью, колесо — масштаб. Кнопка «−» у задачи сворачивает ветку.</p>
        </>
      )}
    </div>
  );
}
