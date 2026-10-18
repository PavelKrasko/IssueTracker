import { memo } from "react";
import { Icon } from "@/components/icons";
import { useAttachmentUrl } from "@/hooks/useAttachmentUrl";
import { Avatar } from "@/components/ui";
import { STATUSES } from "@/constants/issues";
import { cn, focusRing } from "@/utils/cn";
import { DueDate, PriorityIcon, TypeIcon } from "./IssueMeta";

function CardCover({ att }) {
  const { url } = useAttachmentUrl(att);
  return (
    <div className="-mx-3 -mt-3 mb-2 h-28 overflow-hidden rounded-t-md bg-surface-sunken">
      {url && <img src={url} alt="" draggable={false} loading="lazy" className="h-full w-full object-cover" />}
    </div>
  );
}

export const IssueCard = memo(function IssueCard({ issue, assignee, parentKey, subtasksTotal = 0, subtasksDone = 0, onOpen, onMove, dragging, onDragStart, onDragEnd }) {
  const attachments = issue.attachments ?? [];
  const cover = attachments[0];

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(issue.key);
      return;
    }
    if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      const i = STATUSES.findIndex((s) => s.id === issue.status);
      const next = STATUSES[i + (e.key === "ArrowRight" ? 1 : -1)];
      if (next) onMove(issue.id, next.id, { keepFocus: true });
    }
  };

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        draggable
        data-issue-key={issue.key}
        aria-describedby="board-card-hint"
        onClick={() => onOpen(issue.key)}
        onKeyDown={handleKeyDown}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", issue.id);
          e.dataTransfer.effectAllowed = "move";
          onDragStart(issue.id);
        }}
        onDragEnd={onDragEnd}
        className={cn(
          "group cursor-pointer rounded-md bg-surface-raised p-3 shadow-raised transition-[background-color,opacity] duration-fast",
          "hover:bg-surface-hovered active:bg-surface-pressed",
          dragging && "opacity-40",
          focusRing
        )}
      >
        {cover && <CardCover att={cover} />}
        {parentKey && (
          <p className="mb-1 flex items-center gap-1 text-[11px] text-ink-subtle">
            <Icon name="cornerDownRight" className="h-3 w-3" />
            <span className="sr-only">Подзадача </span>
            {parentKey}
          </p>
        )}
        <p className="line-clamp-3 break-words text-sm text-ink">{issue.title}</p>
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          <TypeIcon type={issue.type} />
          <span className="text-xs font-semibold text-ink-subtle">{issue.key}</span>
          <DueDate issue={issue} compact />
          <span className="ml-auto flex items-center gap-2">
            {subtasksTotal > 0 && (
              <span className={cn("inline-flex items-center gap-0.5 text-xs", subtasksDone === subtasksTotal ? "text-success-text" : "text-ink-subtle")} title="Подзадачи: выполнено / всего">
                <Icon name="subtasks" className="h-3.5 w-3.5" />
                <span className="sr-only">Подзадачи: </span>
                {subtasksDone}/{subtasksTotal}
              </span>
            )}
            {issue.commentsCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-ink-subtle" title="Комментарии">
                <Icon name="comment" className="h-3.5 w-3.5" />
                <span className="sr-only">Комментариев: </span>
                {issue.commentsCount}
              </span>
            )}
            {attachments.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-ink-subtle" title="Вложения">
                <Icon name="paperclip" className="h-3.5 w-3.5" />
                <span className="sr-only">Вложений: </span>
                {attachments.length}
              </span>
            )}
            {issue.points != null && (
              <span className="rounded-full bg-neutral px-1.5 text-xs font-semibold text-ink-subtle" title="Оценка в story points">
                <span className="sr-only">Оценка: </span>
                {issue.points}
              </span>
            )}
            <PriorityIcon priority={issue.priority} />
            <Avatar person={assignee} size="sm" />
          </span>
        </div>
      </div>
    </li>
  );
});
