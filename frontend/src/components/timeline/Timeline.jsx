import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { TypeIcon } from "@/components/issues/IssueMeta";
import { STATUS_BY_ID } from "@/constants/issues";
import { useTeams } from "@/context/TeamsContext";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { cn, focusRing } from "@/utils/cn";
import { addDaysISO, diffDays, monthShort, parseISO, today } from "@/utils/dates";
import { formatDate, isOverdue } from "@/utils/format";
import { computeRange, MODES, segments } from "./timelineScale";

const ROW_H = 40;
const HEAD_H = 56;

export const Timeline = forwardRef(function Timeline({ issues, mode, onOpen, onChangeDates }, ref) {
  const { personById } = useTeams();
  const isDesktop = useIsDesktop();
  const leftW = isDesktop ? 300 : 148;
  const { dayW, top, bottom } = MODES[mode];
  const scrollRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const drag = useRef(null);

  const range = useMemo(() => computeRange(issues.map((i) => i.span), mode), [issues, mode]);
  const topSegs = useMemo(() => segments(range, top), [range, top]);
  const bottomSegs = useMemo(() => segments(range, bottom), [range, bottom]);
  const width = range.days * dayW;
  const x = (iso) => diffDays(range.start, parseISO(iso)) * dayW;
  const todayX = diffDays(range.start, today()) * dayW + dayW / 2;

  const scrollToToday = (smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, todayX - (el.clientWidth - leftW) / 3), behavior: smooth ? "smooth" : "auto" });
  };
  useImperativeHandle(ref, () => ({ scrollToToday }));
  useLayoutEffect(() => scrollToToday(false), [mode]);

  const commit = async (issue, start, end) => {
    if (start === issue.span.start && end === issue.span.end) {
      setPreview(null);
      return;
    }
    setPreview({ id: issue.id, start, end });
    try {
      await onChangeDates(issue, { startDate: start, dueDate: end });
    } finally {
      setPreview(null);
    }
  };

  const onPointerDown = (e, issue, kind) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { issue, kind, x0: e.clientX, moved: false, start: issue.span.start, end: issue.span.end };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    if (Math.abs(dx) > 3) d.moved = true;
    const days = Math.round(dx / dayW);
    let { start, end } = d.issue.span;
    if (d.kind === "move") {
      start = addDaysISO(start, days);
      end = addDaysISO(end, days);
    } else if (d.kind === "start") {
      start = addDaysISO(start, days);
      if (start > end) start = end;
    } else {
      end = addDaysISO(end, days);
      if (end < start) end = start;
    }
    d.start = start;
    d.end = end;
    if (d.moved) setPreview({ id: d.issue.id, start, end });
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      setPreview(null);
      onOpen(d.issue.key);
    } else commit(d.issue, d.start, d.end);
  };

  const onBarKeyDown = (e, issue) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(issue.key);
      return;
    }
    if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    const cur = preview?.id === issue.id ? preview : issue.span;
    if (e.shiftKey) {
      const end = addDaysISO(cur.end, step);
      if (end >= cur.start) commit(issue, cur.start, end);
    } else commit(issue, addDaysISO(cur.start, step), addDaysISO(cur.end, step));
  };

  return (
    <div
      ref={scrollRef}
      className="relative max-h-[calc(100dvh-17rem)] min-h-[200px] overflow-auto rounded-lg border border-line bg-surface scrollbar-thin"
    >
      <p id="timeline-hint" className="sr-only">
        Enter — открыть задачу. Alt и стрелка — сдвинуть на день. Alt, Shift и стрелка — изменить срок.
      </p>
      <div className="relative" style={{ width: leftW + width }}>

        <div className="sticky top-0 z-20 flex border-b border-line bg-surface-sunken" style={{ height: HEAD_H }}>
          <div className="sticky left-0 z-10 flex items-end border-r border-line bg-surface-sunken px-3 pb-2 text-xs font-semibold text-ink-subtle" style={{ width: leftW, minWidth: leftW }}>
            Задача
          </div>
          <div className="relative" style={{ width }}>
            {topSegs.map((s) => (
              <div key={s.key} className="absolute top-0 flex h-7 items-center truncate border-l border-line px-2 text-xs font-semibold text-ink" style={{ left: s.from * dayW, width: s.len * dayW }}>
                <span className="sticky truncate" style={{ left: leftW + 8 }}>
                  {s.label}
                </span>
              </div>
            ))}
            {bottomSegs.map((s) => (
              <div
                key={s.key}
                className={cn(
                  "absolute bottom-0 flex h-7 items-center justify-center truncate border-l border-line text-2xs",
                  s.weekend ? "bg-neutral/60 text-ink-subtlest" : "text-ink-subtle"
                )}
                style={{ left: s.from * dayW, width: s.len * dayW }}
              >
                {bottom === "month" ? monthShort(s.date) : s.label}
              </div>
            ))}
            <div className="absolute bottom-0 z-10 -translate-x-1/2 rounded-sm bg-brand px-1.5 text-2xs font-semibold text-ink-inverse" style={{ left: todayX }}>
              Сегодня
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: leftW, width, top: HEAD_H, height: issues.length * ROW_H }}>
          {bottomSegs.map((s) =>
            s.weekend ? (
              <div key={s.key} className="absolute inset-y-0 bg-neutral/40" style={{ left: s.from * dayW, width: s.len * dayW }} />
            ) : (
              <div key={s.key} className="absolute inset-y-0 border-l border-line/60" style={{ left: s.from * dayW }} />
            )
          )}
          <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-brand" style={{ left: todayX }} />
        </div>

        <ul aria-label="Задачи на шкале времени" className="relative">
          {issues.map((issue) => {
            const span = preview?.id === issue.id ? preview : issue.span;
            const left = x(span.start);
            const barW = Math.max((diffDays(parseISO(span.start), parseISO(span.end)) + 1) * dayW, 8);
            const status = STATUS_BY_ID[issue.status];
            const assignee = issue.assigneeId ? personById[issue.assigneeId] : null;
            const overdue = isOverdue({ ...issue, dueDate: span.end });
            const dragging = preview?.id === issue.id;
            return (
              <li key={issue.id} className="group flex border-b border-line/70 hover:bg-surface-hovered/60" style={{ height: ROW_H }}>
                <div className="sticky left-0 z-10 flex items-center gap-2 border-r border-line bg-surface px-3 group-hover:bg-surface-hovered" style={{ width: leftW, minWidth: leftW }}>
                  <TypeIcon type={issue.type} />
                  <button
                    type="button"
                    onClick={() => onOpen(issue.key)}
                    data-issue-key={issue.key}
                    className={cn("flex min-w-0 flex-1 items-baseline gap-2 rounded-sm text-left", focusRing)}
                  >
                    <span className="shrink-0 text-xs font-semibold text-ink-subtle">{issue.key}</span>
                    <span className="hidden truncate text-sm text-ink hover:underline md:inline">{issue.title}</span>
                  </button>
                </div>

                <div className="relative" style={{ width }}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-describedby="timeline-hint"
                    aria-label={`${issue.key} ${issue.title}. ${status.label}. С ${formatDate(span.start)} по ${formatDate(span.end)}${overdue ? ", просрочено" : ""}`}
                    onPointerDown={(e) => onPointerDown(e, issue, "move")}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={() => {
                      drag.current = null;
                      setPreview(null);
                    }}
                    onKeyDown={(e) => onBarKeyDown(e, issue)}
                    title={`${issue.title} · ${formatDate(span.start)} – ${formatDate(span.end)}`}
                    className={cn(
                      "absolute top-1/2 flex h-6 -translate-y-1/2 cursor-grab touch-none select-none items-center rounded-sm shadow-raised transition-[filter] duration-fast hover:brightness-110 active:cursor-grabbing",
                      status.dot,
                      issue.status === "done" && "opacity-70",
                      overdue && "ring-2 ring-danger ring-offset-1 ring-offset-surface",
                      dragging && "z-10 ring-2 ring-line-focus",
                      focusRing
                    )}
                    style={{ left, width: barW }}
                  >

                    <span
                      aria-hidden="true"
                      onPointerDown={(e) => onPointerDown(e, issue, "start")}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-sm hover:bg-black/20"
                    />
                    <span
                      aria-hidden="true"
                      onPointerDown={(e) => onPointerDown(e, issue, "end")}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-sm hover:bg-black/20"
                    />
                  </div>

                  <div className="pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap" style={{ left: left + barW + 6 }}>
                    {assignee && <Avatar person={assignee} size="xs" decorative />}
                    <span className="text-xs text-ink-subtle">
                      {dragging ? `${formatDate(span.start)} – ${formatDate(span.end)}` : issue.title.length > 40 ? `${issue.title.slice(0, 40)}…` : issue.title}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
});
