import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { Avatar, IconButton, StatusLozenge } from "@/components/ui";
import { STATUSES } from "@/constants/issues";
import { useTeams } from "@/context/TeamsContext";
import { priorityWeight } from "@/hooks/useIssueFilters";
import { cn, focusRing } from "@/utils/cn";
import { formatDate } from "@/utils/format";
import { DueDate, PersonLabel, PriorityIcon, TypeIcon } from "./IssueMeta";

const statusIndex = Object.fromEntries(STATUSES.map((s, i) => [s.id, i]));
const keyNum = (key) => Number(key.split("-")[1]) || 0;

const COLUMNS = [
  { id: "key", label: "Ключ", sort: (a, b) => keyNum(a.key) - keyNum(b.key), className: "w-24" },
  { id: "title", label: "Название", sort: (a, b) => a.title.localeCompare(b.title, "ru") },
  { id: "status", label: "Статус", sort: (a, b) => statusIndex[a.status] - statusIndex[b.status], className: "w-36" },
  { id: "priority", label: "Приоритет", sort: (a, b) => priorityWeight(a.priority) - priorityWeight(b.priority), className: "w-32" },
  { id: "assignee", label: "Исполнитель", className: "w-48" },
  { id: "dueDate", label: "Срок", sort: (a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"), className: "w-28" },
  { id: "updatedAt", label: "Обновлена", sort: (a, b) => a.updatedAt.localeCompare(b.updatedAt), className: "w-28" },
];

export function IssueTable({ issues, onOpen, onEdit, onDelete }) {
  const { personById } = useTeams();
  const [sort, setSort] = useState({ id: "updatedAt", dir: "desc" });

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.id === sort.id);
    if (!col?.sort) return issues;
    const list = [...issues].sort(col.sort);
    return sort.dir === "desc" ? list.reverse() : list;
  }, [issues, sort]);

  const toggleSort = (id) => setSort((s) => (s.id === id ? { id, dir: s.dir === "asc" ? "desc" : "asc" } : { id, dir: "asc" }));
  const assigneeOf = (i) => (i.assigneeId ? personById[i.assigneeId] ?? { name: "Удалённый участник", email: i.assigneeId } : null);

  return (
    <>

      <div className="hidden overflow-x-auto rounded-lg border border-line md:block">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <caption className="sr-only">Задачи. Нажмите на заголовок столбца, чтобы отсортировать.</caption>
          <thead className="bg-surface-sunken">
            <tr className="border-b border-line">
              <th scope="col" className="w-10 px-3 text-left text-xs font-semibold text-ink-subtle">
                <span className="sr-only">Тип</span>
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  aria-sort={sort.id === c.id ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  className={cn("h-10 px-2 text-left text-xs font-semibold text-ink-subtle", c.className)}
                >
                  {c.sort ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.id)}
                      className={cn("inline-flex items-center gap-1 rounded-sm px-1 py-0.5 hover:bg-neutral hover:text-ink", focusRing)}
                    >
                      {c.label}
                      <Icon
                        name={sort.id === c.id ? (sort.dir === "asc" ? "arrowUp" : "arrowDown") : "sort"}
                        className={cn("h-3.5 w-3.5", sort.id !== c.id && "opacity-40")}
                      />
                    </button>
                  ) : (
                    <span className="px-1">{c.label}</span>
                  )}
                </th>
              ))}
              <th scope="col" className="w-24 px-2">
                <span className="sr-only">Действия</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((i) => (
              <tr key={i.id} className="border-b border-line last:border-0 hover:bg-surface-hovered">
                <td className="px-3 py-2">
                  <TypeIcon type={i.type} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-ink-subtle">{i.key}</td>
                <td className="max-w-0 px-3 py-2">
                  <button
                    type="button"
                    data-issue-key={i.key}
                    onClick={() => onOpen(i.key)}
                    title={i.title}
                    className={cn("flex w-full items-center gap-1.5 rounded-sm text-left text-ink hover:text-ink-brand hover:underline", focusRing)}
                  >
                    <span className="truncate">{i.title}</span>
                    {i.attachments?.length > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-ink-subtle no-underline" title="Вложения">
                        <Icon name="paperclip" className="h-3.5 w-3.5" />
                        <span className="sr-only">, вложений: </span>
                        {i.attachments.length}
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <StatusLozenge status={i.status} />
                </td>
                <td className="px-3 py-2">
                  <PriorityIcon priority={i.priority} withLabel />
                </td>
                <td className="max-w-0 px-3 py-2">
                  <PersonLabel person={assigneeOf(i)} />
                </td>
                <td className="px-3 py-2">
                  <DueDate issue={i} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">{formatDate(i.updatedAt)}</td>
                <td className="px-2 py-1">
                  <div className="flex justify-end gap-1">
                    <IconButton icon="edit" label={`Редактировать ${i.key}`} onClick={() => onEdit(i)} />
                    <IconButton icon="trash" label={`Удалить ${i.key}`} variant="danger" onClick={() => onDelete(i)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden" aria-label="Задачи">
        {sorted.map((i) => (
          <li key={i.id} className="rounded-lg border border-line bg-surface-raised">
            <button
              type="button"
              data-issue-key={i.key}
              onClick={() => onOpen(i.key)}
              className={cn("block w-full rounded-lg p-3 text-left hover:bg-surface-hovered", focusRing)}
            >
              <span className="flex items-center gap-2">
                <TypeIcon type={i.type} />
                <span className="text-xs font-semibold text-ink-subtle">{i.key}</span>
                <span className="ml-auto">
                  <StatusLozenge status={i.status} />
                </span>
              </span>
              <span className="mt-2 line-clamp-2 block break-words text-sm text-ink">{i.title}</span>
              <span className="mt-3 flex items-center gap-3">
                <PriorityIcon priority={i.priority} />
                <DueDate issue={i} compact />
                <span className="ml-auto">
                  <Avatar person={assigneeOf(i)} size="sm" />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
