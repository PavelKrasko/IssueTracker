import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/icons";
import { Avatar, Button, StatusLozenge } from "@/components/ui";
import { useIssueUI } from "@/context/IssueUIContext";
import { useIssues } from "@/context/IssuesContext";
import { useProject } from "@/context/ProjectContext";
import { useTeams } from "@/context/TeamsContext";
import { useToast } from "@/context/ToastContext";
import { cn, focusRing } from "@/utils/cn";
import { descendants } from "@/utils/planning";
import { TypeIcon } from "./IssueMeta";

export function SubtaskProgress({ done, total, className }) {
  if (!total) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Подзадачи выполнены">
        <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-ink-subtle">
        {done} из {total}
      </span>
    </div>
  );
}

export function IssueSubtasks({ issue }) {
  const { byId, childrenOf, createIssue } = useIssues();
  const { openIssue } = useIssueUI();
  const { personById } = useTeams();
  const { can } = useProject();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const children = childrenOf[issue.id] ?? [];
  const all = descendants(issue.id, childrenOf);
  const done = all.filter((i) => i.status === "done").length;

  const path = [];
  for (let p = byId[issue.parentId]; p && path.length < 10; p = byId[p.parentId]) path.unshift(p);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const created = await createIssue({ title: title.trim(), parentId: issue.id, sprintId: issue.sprintId ?? "", fixVersionId: issue.fixVersionId ?? "", teamId: issue.teamId ?? "" });
      setTitle("");
      toast(`Подзадача ${created.key} создана`);
    } catch (err) {
      toast(err.message, { tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="issue-subtasks" className="mt-6">
      {path.length > 0 && (
        <nav aria-label="Родительские задачи" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-ink-subtle">
          <Icon name="cornerDownRight" className="h-3.5 w-3.5" />
          {path.map((p, idx) => (
            <span key={p.id} className="flex items-center gap-1">
              {idx > 0 && <Icon name="chevronRight" className="h-3 w-3" />}
              <button type="button" onClick={() => openIssue(p.key)} className={cn("rounded-sm font-medium text-ink-brand hover:underline", focusRing)} title={p.title}>
                {p.key}
              </button>
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-center justify-between gap-2">
        <h3 id="issue-subtasks" className="text-sm font-semibold text-ink">
          Подзадачи
        </h3>
        <div className="flex items-center gap-1">
          {(children.length > 0 || issue.parentId) && (
            <Link to={`/app/tree?root=${encodeURIComponent(path[0]?.key ?? issue.key)}`} className={cn("inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-ink-brand hover:bg-brand-subtle", focusRing)}>
              <Icon name="tree" className="h-3.5 w-3.5" />
              На графе
            </Link>
          )}
          {can.edit && !adding && (
            <Button size="sm" variant="subtle" iconBefore="plus" onClick={() => setAdding(true)} aria-label="Добавить подзадачу">
              Добавить
            </Button>
          )}
        </div>
      </div>

      <SubtaskProgress done={done} total={all.length} className="mt-2" />

      {children.length > 0 && (
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
          {children.map((c) => {
            const sub = descendants(c.id, childrenOf);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openIssue(c.key)}
                  className={cn("flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-hovered", focusRing)}
                >
                  <TypeIcon type={c.type} />
                  <span className={cn("shrink-0 text-xs font-semibold", c.status === "done" ? "text-ink-subtlest line-through" : "text-ink-subtle")}>{c.key}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.title}</span>
                  {sub.length > 0 && (
                    <span className="flex shrink-0 items-center gap-0.5 text-xs text-ink-subtle" title={`Вложенных подзадач: ${sub.length}`}>
                      <Icon name="subtasks" className="h-3.5 w-3.5" />
                      {sub.length}
                    </span>
                  )}
                  {c.assigneeId && <Avatar person={personById[c.assigneeId]} size="xs" decorative />}
                  <StatusLozenge status={c.status} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <form onSubmit={add} className="mt-2 flex gap-2">
          <label htmlFor="new-subtask" className="sr-only">
            Название подзадачи
          </label>
          <input
            id="new-subtask"
            autoFocus
            value={title}
            maxLength={255}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setAdding(false))}
            placeholder="Название подзадачи и Enter"
            disabled={saving}
            className="h-8 min-w-0 flex-1 rounded-sm border border-line-bold/60 bg-surface px-2 text-sm text-ink placeholder:text-ink-subtlest focus-visible:border-line-focus focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-line-focus"
          />
          <Button type="submit" size="sm" variant="primary" loading={saving} disabled={!title.trim()}>
            Создать
          </Button>
          <Button size="sm" variant="subtle" onClick={() => setAdding(false)}>
            Готово
          </Button>
        </form>
      )}

      {!children.length && !adding && <p className="mt-2 text-xs text-ink-subtlest">Разбейте задачу на шаги — прогресс посчитается сам.</p>}
    </section>
  );
}
