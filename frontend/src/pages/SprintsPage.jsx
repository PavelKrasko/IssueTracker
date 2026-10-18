import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { BurndownCard } from "@/components/planning/BurndownCard";
import { CompleteSprintModal } from "@/components/planning/CompleteSprintModal";
import { IssueRowCompact } from "@/components/planning/IssueRowCompact";
import { SprintFormModal } from "@/components/planning/SprintFormModal";
import { Button, Card, ConfirmDialog, EmptyState, Menu, PageHeader, PageSpinner } from "@/components/ui";
import { useIssueUI } from "@/context/IssueUIContext";
import { useIssues } from "@/context/IssuesContext";
import { usePlanning } from "@/context/PlanningContext";
import { useProject } from "@/context/ProjectContext";
import { useToast } from "@/context/ToastContext";
import { cn, focusRing } from "@/utils/cn";
import { countLabel, formatDate } from "@/utils/format";

const ISSUES = ["задача", "задачи", "задач"];

function daysLeft(endDate) {
  const [y, m, d] = endDate.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((end - today) / 86400000);
}

function Progress({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Выполнено">
        <div className="h-full rounded-full bg-success transition-[width] duration-slow" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold tabular-nums text-ink-subtle">{pct}%</span>
    </div>
  );
}

function MoveToSprint({ issue, sprints, onMove }) {
  return (
    <select
      aria-label={`Спринт для ${issue.key}`}
      value={issue.sprintId ?? ""}
      onChange={(e) => onMove(issue, e.target.value)}
      className={cn("h-7 max-w-[9rem] shrink-0 rounded-sm border border-line-bold/60 bg-surface px-1 text-xs text-ink", focusRing)}
    >
      <option value="">Бэклог</option>
      {sprints.map((s) => (
        <option key={s.id} value={s.id}>
          {s.state === "active" ? `▶ ${s.name}` : s.name}
        </option>
      ))}
    </select>
  );
}

function SprintSection({ sprint, issues, children, actions, open, onToggle }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
        <button type="button" onClick={onToggle} aria-expanded={open} className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left", focusRing)}>
          <Icon name={open ? "chevronDown" : "chevronRight"} className="h-4 w-4 shrink-0 text-ink-subtle" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">{sprint.name}</span>
            <span className="block text-xs text-ink-subtle">
              {sprint.startDate ? `${formatDate(sprint.startDate)} — ${formatDate(sprint.endDate)} · ` : ""}
              {countLabel(issues.length, ISSUES)}
              {sprint.pointsTotal > 0 ? ` · ${sprint.pointsTotal} SP` : ""}
            </span>
          </span>
        </button>
        {actions}
      </div>
      {open && children}
    </Card>
  );
}

export default function SprintsPage() {
  const { issues } = useIssues();
  const planning = usePlanning();
  const { sprints, activeSprint, status, error, reload } = planning;
  const { can } = useProject();
  const { openCreate } = useIssueUI();
  const { updateIssue } = useIssues();
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [openIds, setOpenIds] = useState({});
  const [showClosed, setShowClosed] = useState(false);

  const bySprint = useMemo(() => {
    const map = { backlog: [] };
    for (const i of issues) {
      if (i.sprintId) (map[i.sprintId] ??= []).push(i);
      else if (i.status !== "done") map.backlog.push(i);
    }
    for (const list of Object.values(map)) list.sort((a, b) => (a.status === "done") - (b.status === "done") || a.number - b.number);
    return map;
  }, [issues]);

  const planned = sprints.filter((s) => s.state === "planned");
  const closed = sprints.filter((s) => s.state === "closed");
  const assignable = sprints.filter((s) => s.state !== "closed");

  const move = async (issue, sprintId) => {
    try {
      await updateIssue(issue.id, { sprintId });
      const target = sprints.find((s) => s.id === sprintId);
      toast(`${issue.key} → ${target ? target.name : "бэклог"}`);
    } catch (e) {
      toast(e.message, { tone: "error" });
    }
  };

  const run = (fn, ok) => async (...args) => {
    await fn(...args);
    if (ok) toast(ok);
  };

  if (status === "loading") return <PageSpinner label="Загружаем спринты…" />;
  if (status === "error")
    return (
      <EmptyState role="alert" tone="danger" icon="alert" title="Не удалось загрузить спринты" action={<Button onClick={reload}>Повторить</Button>}>
        {error}
      </EmptyState>
    );

  const isOpen = (id, def) => openIds[id] ?? def;
  const toggle = (id, def) => setOpenIds((x) => ({ ...x, [id]: !(x[id] ?? def) }));
  const rowActions = (i) => (can.edit ? <MoveToSprint issue={i} sprints={assignable} onMove={move} /> : null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Спринты"
        subtitle="Планируйте работу короткими итерациями: бэклог → спринт → результат"
        actions={
          can.edit && (
            <Button variant="primary" iconBefore="plus" onClick={() => setModal({ type: "create" })}>
              Новый спринт
            </Button>
          )
        }
      />

      {activeSprint ? (
        <section aria-labelledby="active-sprint" className="flex flex-col gap-4">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-brand">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden="true" /> Активный спринт
                </p>
                <h2 id="active-sprint" className="mt-1 text-lg font-semibold text-ink">
                  {activeSprint.name}
                </h2>
                {activeSprint.goal && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-subtle">
                    <Icon name="goal" className="mt-0.5 h-4 w-4 shrink-0" />
                    {activeSprint.goal}
                  </p>
                )}
                <p className="mt-2 text-xs text-ink-subtle">
                  {formatDate(activeSprint.startDate)} — {formatDate(activeSprint.endDate)} ·{" "}
                  {(() => {
                    const n = daysLeft(activeSprint.endDate);
                    if (n < 0) return <span className="font-semibold text-danger-text">просрочен на {countLabel(-n, ["день", "дня", "дней"])}</span>;
                    if (n === 0) return <span className="font-semibold text-warning-text">последний день</span>;
                    return `осталось ${countLabel(n, ["день", "дня", "дней"])}`;
                  })()}
                </p>
              </div>
              {can.edit && (
                <div className="flex gap-2">
                  <Button iconBefore="edit" variant="subtle" onClick={() => setModal({ type: "edit", sprint: activeSprint })}>
                    Изменить
                  </Button>
                  <Button iconBefore="flag" onClick={() => setModal({ type: "complete", sprint: activeSprint })}>
                    Завершить
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-subtle">Задачи</p>
                <p className="text-lg font-semibold tabular-nums text-ink">
                  {activeSprint.issuesDone} / {activeSprint.issuesTotal}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-subtle">Story points</p>
                <p className="text-lg font-semibold tabular-nums text-ink">
                  {activeSprint.pointsDone} / {activeSprint.pointsTotal}
                </p>
              </div>
              <div className="self-end">
                <Progress done={activeSprint.issuesDone} total={activeSprint.issuesTotal} />
              </div>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <BurndownCard sprint={activeSprint} version={`${activeSprint.issuesDone}-${activeSprint.issuesTotal}-${activeSprint.pointsDone}`} />
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-ink">Задачи спринта</h3>
                {can.edit && (
                  <Button size="sm" variant="subtle" iconBefore="plus" onClick={() => openCreate({ sprintId: activeSprint.id })}>
                    Задача
                  </Button>
                )}
              </div>
              {(bySprint[activeSprint.id] ?? []).length ? (
                <ul className="max-h-[360px] divide-y divide-line overflow-y-auto border-t border-line">
                  {bySprint[activeSprint.id].map((i) => (
                    <IssueRowCompact key={i.id} issue={i} actions={rowActions(i)} />
                  ))}
                </ul>
              ) : (
                <p className="border-t border-line px-5 py-6 text-sm text-ink-subtle">В спринте пока нет задач — перенесите их из бэклога ниже.</p>
              )}
            </Card>
          </div>
        </section>
      ) : (
        <Card className="flex flex-col items-start gap-2 p-4 sm:flex-row sm:items-center sm:p-5">
          <Icon name="sprint" className="h-6 w-6 text-ink-brand" />
          <p className="flex-1 text-sm text-ink">
            Нет активного спринта.{" "}
            {planned.length ? "Начните запланированный спринт ниже." : "Создайте спринт, добавьте в него задачи из бэклога и начните."}
          </p>
        </Card>
      )}

      {planned.length > 0 && (
        <section aria-labelledby="planned-sprints" className="flex flex-col gap-3">
          <h2 id="planned-sprints" className="text-base font-semibold text-ink">
            Запланированные
          </h2>
          {planned.map((s) => {
            const list = bySprint[s.id] ?? [];
            return (
              <SprintSection
                key={s.id}
                sprint={s}
                issues={list}
                open={isOpen(s.id, true)}
                onToggle={() => toggle(s.id, true)}
                actions={
                  can.edit && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" iconBefore="play" disabled={Boolean(activeSprint)} title={activeSprint ? "Сначала завершите активный спринт" : undefined} onClick={() => setModal({ type: "start", sprint: s })}>
                        Начать
                      </Button>
                      <Menu
                        items={[
                          { label: "Новая задача в спринте", icon: "plus", onSelect: () => openCreate({ sprintId: s.id }) },
                          { label: "Изменить", icon: "edit", onSelect: () => setModal({ type: "edit", sprint: s }) },
                          { label: "Удалить", icon: "trash", tone: "danger", separatorBefore: true, onSelect: () => setToDelete(s) },
                        ]}
                        renderTrigger={({ ref, props }) => (
                          <button ref={ref} type="button" aria-label={`Действия: ${s.name}`} className={cn("grid h-7 w-7 place-items-center rounded-sm text-ink-subtle hover:bg-neutral", focusRing)} {...props}>
                            <Icon name="more" />
                          </button>
                        )}
                      />
                    </div>
                  )
                }
              >
                {s.goal && <p className="border-t border-line px-5 py-2 text-xs text-ink-subtle">Цель: {s.goal}</p>}
                {list.length ? (
                  <ul className="divide-y divide-line border-t border-line">
                    {list.map((i) => (
                      <IssueRowCompact key={i.id} issue={i} actions={rowActions(i)} />
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-line px-5 py-4 text-sm text-ink-subtle">Пусто. Выберите этот спринт у задач в бэклоге.</p>
                )}
              </SprintSection>
            );
          })}
        </section>
      )}

      <section aria-labelledby="backlog" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="backlog" className="text-base font-semibold text-ink">
            Бэклог <span className="text-sm font-normal text-ink-subtle">· {countLabel(bySprint.backlog.length, ISSUES)}</span>
          </h2>
          {can.edit && (
            <Button size="sm" variant="subtle" iconBefore="plus" onClick={() => openCreate()}>
              Задача
            </Button>
          )}
        </div>
        <Card className="overflow-hidden">
          {bySprint.backlog.length ? (
            <ul className="divide-y divide-line">
              {bySprint.backlog.map((i) => (
                <IssueRowCompact key={i.id} issue={i} actions={rowActions(i)} />
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-ink-subtle">Бэклог пуст: все незавершённые задачи распределены по спринтам.</p>
          )}
        </Card>
      </section>

      {closed.length > 0 && (
        <section aria-labelledby="closed-sprints" className="flex flex-col gap-3">
          <button type="button" onClick={() => setShowClosed((v) => !v)} aria-expanded={showClosed} className={cn("flex items-center gap-2 self-start rounded-sm text-base font-semibold text-ink", focusRing)}>
            <Icon name={showClosed ? "chevronDown" : "chevronRight"} />
            <span id="closed-sprints">Завершённые ({closed.length})</span>
          </button>
          {showClosed &&
            closed.map((s) => (
              <SprintSection key={s.id} sprint={s} issues={bySprint[s.id] ?? []} open={isOpen(s.id, false)} onToggle={() => toggle(s.id, false)}
                actions={<span className="text-xs text-ink-subtle">выполнено {s.issuesDone} из {s.issuesTotal}</span>}
              >
                <div className="border-t border-line px-4 py-4 sm:px-5">
                  <BurndownCard sprint={s} />
                </div>
                {(bySprint[s.id] ?? []).length > 0 && (
                  <ul className="divide-y divide-line border-t border-line">
                    {bySprint[s.id].map((i) => (
                      <IssueRowCompact key={i.id} issue={i} />
                    ))}
                  </ul>
                )}
              </SprintSection>
            ))}
        </section>
      )}

      {(modal?.type === "create" || modal?.type === "edit" || modal?.type === "start") && (
        <SprintFormModal
          mode={modal.type}
          sprint={modal.sprint}
          defaultName={`Спринт ${sprints.length + 1}`}
          onClose={() => setModal(null)}
          onSubmit={
            modal.type === "create"
              ? run(planning.createSprint, "Спринт создан")
              : modal.type === "edit"
                ? run((d) => planning.updateSprint(modal.sprint.id, d), "Спринт сохранён")
                : run((d) => planning.startSprint(modal.sprint.id, d), "Спринт начат — удачи!")
          }
        />
      )}
      {modal?.type === "complete" && (
        <CompleteSprintModal
          sprint={modal.sprint}
          unfinished={modal.sprint.issuesTotal - modal.sprint.issuesDone}
          plannedSprints={planned}
          onClose={() => setModal(null)}
          onConfirm={async (moveTo) => {
            const res = await planning.completeSprint(modal.sprint.id, moveTo);
            toast(res.movedIssues ? `Спринт завершён, перенесено: ${countLabel(res.movedIssues, ISSUES)}` : "Спринт завершён");
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          await planning.deleteSprint(toDelete.id);
          toast("Спринт удалён, задачи вернулись в бэклог");
        }}
        title={toDelete ? `Удалить «${toDelete.name}»?` : ""}
        description="Задачи спринта не удалятся — они вернутся в бэклог."
        confirmLabel="Удалить спринт"
      />
    </div>
  );
}
