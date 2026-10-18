import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { PRIORITY_BY_ID, TYPE_BY_ID } from "@/constants/issues";
import { cn } from "@/utils/cn";
import { formatDate, isOverdue } from "@/utils/format";

export function TypeIcon({ type, size = "sm" }) {
  const t = TYPE_BY_ID[type] ?? TYPE_BY_ID.task;
  return (
    <span
      role="img"
      aria-label={t.label}
      title={t.label}
      className={cn("inline-grid shrink-0 place-items-center rounded-xs text-ink-inverse", t.bg, size === "sm" ? "h-4 w-4" : "h-5 w-5")}
    >
      <Icon name={t.icon} className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.5} />
    </span>
  );
}

export function PriorityIcon({ priority, withLabel = false }) {
  const p = PRIORITY_BY_ID[priority] ?? PRIORITY_BY_ID.medium;
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <span role="img" aria-label={`Приоритет: ${p.label}`} title={`Приоритет: ${p.label}`} className={cn("inline-flex", p.color)}>
        <Icon name={p.icon} className="h-4 w-4" strokeWidth={2.5} />
      </span>
      {withLabel && (
        <span className="text-sm text-ink" aria-hidden="true">
          {p.label}
        </span>
      )}
    </span>
  );
}

export function DueDate({ issue, compact = false }) {
  if (!issue.dueDate) return compact ? null : <span className="text-ink-subtlest">—</span>;
  const overdue = isOverdue(issue);
  return (
    <span
      title={overdue ? "Срок прошёл" : "Срок"}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        compact ? "rounded-sm px-1 text-xs" : "text-sm",
        overdue ? "font-semibold text-danger-text" : compact ? "text-ink-subtle" : "text-ink",
        compact && overdue && "bg-danger-subtle"
      )}
    >
      <Icon name={overdue ? "alert" : "calendar"} className="h-3.5 w-3.5" />
      {formatDate(issue.dueDate)}
      {overdue && <span className="sr-only">, просрочено</span>}
    </span>
  );
}

export function PersonLabel({ person, size = "sm" }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar person={person} size={size} decorative />
      <span className={cn("truncate text-sm", person ? "text-ink" : "text-ink-subtlest")}>{person ? person.name : "Не назначено"}</span>
    </span>
  );
}
