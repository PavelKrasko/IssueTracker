import { Avatar, StatusLozenge } from "@/components/ui";
import { useIssueUI } from "@/context/IssueUIContext";
import { useTeams } from "@/context/TeamsContext";
import { cn, focusRing } from "@/utils/cn";
import { PriorityIcon, TypeIcon } from "@/components/issues/IssueMeta";

export function IssueRowCompact({ issue, actions }) {
  const { openIssue } = useIssueUI();
  const { personById } = useTeams();
  return (
    <li className="flex items-center gap-2 px-3 py-2 hover:bg-surface-hovered">
      <button type="button" data-issue-key={issue.key} onClick={() => openIssue(issue.key)} className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left", focusRing)}>
        <TypeIcon type={issue.type} />
        <span className={cn("shrink-0 text-xs font-semibold", issue.status === "done" ? "text-ink-subtlest line-through" : "text-ink-subtle")}>{issue.key}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{issue.title}</span>
      </button>
      <span className="hidden shrink-0 items-center gap-2 sm:flex">
        <PriorityIcon priority={issue.priority} />
        {issue.points != null && <span className="rounded-full bg-neutral px-1.5 text-xs font-semibold text-ink-subtle" title="Story points">{issue.points}</span>}
        <Avatar person={issue.assigneeId ? personById[issue.assigneeId] : null} size="xs" />
        <StatusLozenge status={issue.status} />
      </span>
      {actions}
    </li>
  );
}
