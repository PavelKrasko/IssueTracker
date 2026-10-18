import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@/components/icons";
import { Avatar, Button, Spinner } from "@/components/ui";
import { useIssueUI } from "@/context/IssueUIContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useProject } from "@/context/ProjectContext";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn, focusRing } from "@/utils/cn";
import { timeAgo } from "@/utils/format";

const STATUS = { todo: "К выполнению", in_progress: "В работе", review: "На проверке", done: "Готово" };

export function notificationText(n) {
  switch (n.kind) {
    case "assigned":
      return "назначил(а) вас исполнителем";
    case "mentioned":
      return "упомянул(а) вас";
    case "commented":
      return "оставил(а) комментарий";
    case "status":
      return `сменил(а) статус: ${STATUS[n.payload.from] ?? n.payload.from} → ${STATUS[n.payload.to] ?? n.payload.to}`;
    default:
      return "обновил(а) задачу";
  }
}

const KIND_ICON = { assigned: "user", mentioned: "comment", commented: "comment", status: "sprint" };

export function NotificationBell() {
  const { items, unread, status, markRead } = useNotifications();
  const { current, projects, select } = useProject();
  const { openIssue } = useIssueUI();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();

  useClickOutside([btnRef, panelRef], () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (n) => {
    if (!n.read) markRead([n.id]);
    setOpen(false);
    const key = n.payload.issueKey;
    if (!key) return;
    if (n.projectId && n.projectId !== current.id) {
      if (!projects.some((p) => p.id === n.projectId)) return;
      select(n.projectId);
      navigate(`/app/board?issue=${encodeURIComponent(key)}`);
    } else {
      openIssue(key);
    }
  };

  const projectName = (id) => projects.find((p) => p.id === id)?.name;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={unread ? `Уведомления: ${unread} непрочитанных` : "Уведомления"}
        title="Уведомления"
        className={cn("relative grid h-9 w-9 place-items-center rounded-sm text-ink-subtle hover:bg-neutral hover:text-ink", focusRing)}
      >
        <Icon name="bell" className="h-5 w-5" />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Уведомления"
          className="fixed inset-x-2 top-16 z-40 flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-lg border border-line bg-surface-overlay shadow-overlay sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Уведомления</h2>
            {unread > 0 && (
              <Button size="sm" variant="subtle" iconBefore="checkCheck" onClick={() => markRead("all")}>
                Прочитать все
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {status === "loading" ? (
              <div className="grid place-items-center py-10">
                <Spinner label="Загрузка уведомлений" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <Icon name="bell" className="h-8 w-8 text-ink-subtlest" />
                <p className="mt-2 text-sm font-semibold text-ink">Пока тихо</p>
                <p className="mt-1 text-xs text-ink-subtle">Здесь появятся назначения, упоминания и комментарии в задачах, за которыми вы следите.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => go(n)}
                      className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-hovered", !n.read && "bg-brand-subtle/40", focusRing)}
                    >
                      <span className="relative shrink-0 self-start">
                        <Avatar person={{ name: n.actorName ?? "?", email: n.actorId ?? "", avatarUrl: n.actorAvatarUrl }} size="md" decorative />
                        <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-surface-overlay text-ink-subtle ring-1 ring-line">
                          <Icon name={KIND_ICON[n.kind] ?? "bell"} className="h-2.5 w-2.5" />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink">
                          <b className="font-semibold">{n.actorName ?? "Кто-то"}</b> {notificationText(n)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-subtle">
                          <span className="font-semibold">{n.payload.issueKey}</span> · {n.payload.title}
                        </span>
                        {n.payload.text && <span className="mt-1 line-clamp-2 block text-xs italic text-ink-subtle">«{n.payload.text}»</span>}
                        <span className="mt-1 block text-[11px] text-ink-subtlest">
                          {timeAgo(n.createdAt)}
                          {n.projectId !== current.id && projectName(n.projectId) ? ` · ${projectName(n.projectId)}` : ""}
                        </span>
                      </span>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Не прочитано" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-line px-4 py-2 text-xs text-ink-subtle">
            Уведомления в Telegram —{" "}
            <Link to="/app/profile#telegram" onClick={() => setOpen(false)} className="text-ink-brand hover:underline">
              в профиле
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
