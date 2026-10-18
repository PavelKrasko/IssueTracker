import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { IssueRowCompact } from "@/components/planning/IssueRowCompact";
import { VersionFormModal } from "@/components/planning/VersionFormModal";
import { Button, Card, ConfirmDialog, EmptyState, Menu, PageHeader, PageSpinner } from "@/components/ui";
import { useIssueUI } from "@/context/IssueUIContext";
import { useIssues } from "@/context/IssuesContext";
import { usePlanning } from "@/context/PlanningContext";
import { useProject } from "@/context/ProjectContext";
import { useToast } from "@/context/ToastContext";
import { cn, focusRing } from "@/utils/cn";
import { countLabel, formatDate, formatDateFull, toISODate } from "@/utils/format";

const ISSUES = ["задача", "задачи", "задач"];

function versionState(v) {
  if (v.released) return { label: "Выпущена", cls: "bg-success-subtle text-success-text", icon: "rocket" };
  if (v.releaseDate && v.releaseDate < toISODate()) return { label: "Просрочена", cls: "bg-danger-subtle text-danger-text", icon: "alert" };
  return { label: "В работе", cls: "bg-brand-subtle text-ink-brand", icon: "release" };
}

function changelog(v, issues) {
  const done = issues.filter((i) => i.status === "done");
  const group = (type, title) => {
    const list = done.filter((i) => i.type === type);
    return list.length ? `### ${title}\n${list.map((i) => `- ${i.key}: ${i.title}`).join("\n")}\n` : "";
  };
  const date = v.releasedAt ? toISODate(new Date(v.releasedAt)) : v.releaseDate ?? "";
  return [`## ${v.name}${date ? ` — ${date}` : ""}`, v.description, group("story", "Новое"), group("task", "Улучшения"), group("bug", "Исправлено")].filter(Boolean).join("\n\n").trim();
}

export default function ReleasesPage() {
  const { issues } = useIssues();
  const { versions, status, error, reload, createVersion, updateVersion, deleteVersion } = usePlanning();
  const { can } = useProject();
  const { openCreate } = useIssueUI();
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [openId, setOpenId] = useState(null);

  const byVersion = useMemo(() => {
    const map = {};
    for (const i of issues) if (i.fixVersionId) (map[i.fixVersionId] ??= []).push(i);
    return map;
  }, [issues]);

  if (status === "loading") return <PageSpinner label="Загружаем версии…" />;
  if (status === "error")
    return (
      <EmptyState role="alert" tone="danger" icon="alert" title="Не удалось загрузить версии" action={<Button onClick={reload}>Повторить</Button>}>
        {error}
      </EmptyState>
    );

  const copyChangelog = async (v) => {
    try {
      await navigator.clipboard.writeText(changelog(v, byVersion[v.id] ?? []));
      toast("Список изменений скопирован в Markdown");
    } catch {
      toast("Не удалось скопировать", { tone: "error" });
    }
  };

  const toggleRelease = async (v) => {
    const notDone = (byVersion[v.id] ?? []).filter((i) => i.status !== "done").length;
    try {
      await updateVersion(v.id, { released: !v.released });
      toast(v.released ? `Версия ${v.name} снова в работе` : notDone ? `Версия ${v.name} выпущена (незавершённых: ${notDone})` : `Версия ${v.name} выпущена 🚀`);
    } catch (e) {
      toast(e.message, { tone: "error" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Релизы"
        subtitle="Версии продукта: что войдёт в выпуск, сколько готово и список изменений"
        actions={
          can.edit && (
            <Button variant="primary" iconBefore="plus" onClick={() => setModal({})}>
              Новая версия
            </Button>
          )
        }
      />

      {versions.length === 0 ? (
        <EmptyState icon="release" title="Версий пока нет" action={can.edit && <Button variant="primary" onClick={() => setModal({})}>Создать первую версию</Button>}>
          Создайте версию (например, 1.0.0) и укажите её у задач в поле «Версия» — здесь появится прогресс и список изменений.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {versions.map((v) => {
            const list = byVersion[v.id] ?? [];
            const st = versionState(v);
            const pct = v.issuesTotal ? Math.round((v.issuesDone / v.issuesTotal) * 100) : 0;
            const open = openId === v.id;
            return (
              <li key={v.id}>
                <Card className="overflow-hidden">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                    <button type="button" onClick={() => setOpenId(open ? null : v.id)} aria-expanded={open} className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left", focusRing)}>
                      <Icon name={open ? "chevronDown" : "chevronRight"} className="h-4 w-4 shrink-0 text-ink-subtle" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{v.name}</span>
                          <span className={cn("inline-flex items-center gap-1 rounded-sm px-1.5 py-px text-2xs font-bold uppercase", st.cls)}>
                            <Icon name={st.icon} className="h-3 w-3" />
                            {st.label}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-subtle">
                          {v.released ? `Выпущена ${formatDateFull(v.releasedAt)}` : v.releaseDate ? `Выпуск ${formatDate(v.releaseDate)}` : "Дата не назначена"} · {countLabel(v.issuesTotal, ISSUES)}
                        </span>
                      </span>
                    </button>
                    <div className="flex w-full items-center gap-2 sm:w-48">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Готовность ${v.name}`}>
                        <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-right text-xs tabular-nums text-ink-subtle">
                        {v.issuesDone}/{v.issuesTotal}
                      </span>
                    </div>
                    {can.edit && (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant={v.released ? "subtle" : "default"} iconBefore={v.released ? "sprint" : "rocket"} onClick={() => toggleRelease(v)}>
                          {v.released ? "Вернуть" : "Выпустить"}
                        </Button>
                        <Menu
                          items={[
                            { label: "Скопировать список изменений", icon: "copy", onSelect: () => copyChangelog(v) },
                            { label: "Новая задача в версии", icon: "plus", onSelect: () => openCreate({ fixVersionId: v.id }) },
                            { label: "Изменить", icon: "edit", onSelect: () => setModal({ version: v }) },
                            { label: "Удалить", icon: "trash", tone: "danger", separatorBefore: true, onSelect: () => setToDelete(v) },
                          ]}
                          renderTrigger={({ ref, props }) => (
                            <button ref={ref} type="button" aria-label={`Действия: ${v.name}`} className={cn("grid h-7 w-7 place-items-center rounded-sm text-ink-subtle hover:bg-neutral", focusRing)} {...props}>
                              <Icon name="more" />
                            </button>
                          )}
                        />
                      </div>
                    )}
                  </div>
                  {open && (
                    <div className="border-t border-line">
                      {v.description && <p className="whitespace-pre-wrap px-5 py-3 text-sm text-ink-subtle">{v.description}</p>}
                      {list.length ? (
                        <ul className="divide-y divide-line border-t border-line">
                          {list
                            .slice()
                            .sort((a, b) => (a.status === "done") - (b.status === "done") || a.number - b.number)
                            .map((i) => (
                              <IssueRowCompact key={i.id} issue={i} />
                            ))}
                        </ul>
                      ) : (
                        <p className="px-5 py-4 text-sm text-ink-subtle">В версию пока не добавлено задач — выберите её в поле «Версия» у задачи.</p>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {modal && (
        <VersionFormModal
          version={modal.version}
          onClose={() => setModal(null)}
          onSubmit={async (data) => {
            if (modal.version) {
              await updateVersion(modal.version.id, data);
              toast("Версия сохранена");
            } else {
              const { released: _released, ...rest } = data;
              await createVersion(rest);
              toast(`Версия ${data.name} создана`);
            }
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          await deleteVersion(toDelete.id);
          toast("Версия удалена");
        }}
        title={toDelete ? `Удалить версию ${toDelete.name}?` : ""}
        description="Задачи останутся, у них просто очистится поле «Версия»."
        confirmLabel="Удалить версию"
      />
    </div>
  );
}
