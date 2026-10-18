import { useState } from "react";
import { IssueAttachments } from "@/components/attachments/IssueAttachments";
import { IssueComments } from "@/components/collab/IssueComments";
import { IssueTimeTracking } from "@/components/collab/IssueTimeTracking";
import { RichText } from "@/components/collab/RichText";
import { WatchButton } from "@/components/collab/WatchButton";
import { IssueDocs } from "@/components/docs/IssueDocs";
import { Button, Drawer, EmptyState, IconButton, SelectField, StatusLozenge } from "@/components/ui";
import { PRIORITIES, STATUSES } from "@/constants/issues";
import { useAuth } from "@/context/AuthContext";
import { useIssueUI } from "@/context/IssueUIContext";
import { useIssues } from "@/context/IssuesContext";
import { usePlanning } from "@/context/PlanningContext";
import { useProject } from "@/context/ProjectContext";
import { useTeams } from "@/context/TeamsContext";
import { useToast } from "@/context/ToastContext";
import { formatDate, formatDateTime } from "@/utils/format";
import { sprintOptions } from "@/utils/planning";
import { BranchButton } from "./BranchButton";
import { IssueSubtasks } from "./IssueSubtasks";
import { DueDate, PersonLabel, TypeIcon } from "./IssueMeta";

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3 py-2 sm:grid-cols-[140px_1fr]">
      <dt className="text-xs font-semibold text-ink-subtle">{label}</dt>
      <dd className="min-w-0 text-sm text-ink">{children}</dd>
    </div>
  );
}

export function IssueDetailsDrawer({ issueKey, issue, loading, onClose, onEdit, onDelete, onUpdate }) {
  const { user } = useAuth();
  const { people, personById, teamById } = useTeams();
  const { sprints, versions, sprintById, versionById } = usePlanning();
  const { byId } = useIssues();
  const { openIssue } = useIssueUI();
  const { can } = useProject();
  const toast = useToast();
  const [savingField, setSavingField] = useState(null);

  const quickUpdate = (field) => async (e) => {
    const value = e.target.value;
    setSavingField(field);
    try {
      await onUpdate(issue.id, { [field]: value });
    } catch (err) {
      toast(`Не удалось сохранить: ${err.message}`, { tone: "error" });
    } finally {
      setSavingField(null);
    }
  };

  const reporter = issue && (issue.reporterId === user?.id ? { name: user.name, email: user.email } : personById[issue.reporterId]);
  const assignee = issue?.assigneeId ? personById[issue.assigneeId] ?? { name: "Удалённый участник", email: issue.assigneeId } : null;
  const team = issue?.teamId ? teamById[issue.teamId] : null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={issue ? `${issue.key}: ${issue.title}` : "Задача"}
      returnFocusTo={() => document.querySelector(`[data-issue-key="${issueKey}"]`)}
      header={
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4 sm:px-6">
          {issue && <TypeIcon type={issue.type} size="md" />}
          <span className="text-sm font-semibold text-ink-subtle">{issueKey}</span>
          <div className="ml-auto flex items-center gap-1">
            {issue && (
              <>
                <IconButton icon="edit" label="Редактировать задачу" onClick={() => onEdit(issue)} />
                <IconButton icon="trash" label="Удалить задачу" variant="danger" onClick={() => onDelete(issue)} />
              </>
            )}
            <IconButton icon="x" label="Закрыть" onClick={onClose} data-autofocus />
          </div>
        </div>
      }
    >
      {!issue ? (
        loading ? (
          <p className="p-6 text-sm text-ink-subtle">Загрузка задачи…</p>
        ) : (
          <EmptyState icon="alert" title="Задача не найдена" action={<Button onClick={onClose}>Закрыть</Button>}>
            Возможно, её удалили или ссылка устарела.
          </EmptyState>
        )
      ) : (
        <div className="px-4 py-5 sm:px-6">
          <p className="break-words text-xl font-semibold text-ink">{issue.title}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <StatusLozenge status={issue.status} />
            <WatchButton issue={issue} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SelectField
              label="Статус"
              size="sm"
              value={issue.status}
              onChange={quickUpdate("status")}
              disabled={savingField === "status"}
              options={STATUSES.map((s) => ({ value: s.id, label: s.label }))}
            />
            <SelectField
              label="Исполнитель"
              size="sm"
              value={issue.assigneeId ?? ""}
              onChange={quickUpdate("assigneeId")}
              disabled={savingField === "assigneeId"}
              placeholder="Не назначено"
              options={people.map((p) => ({ value: p.id, label: p.isMe ? `${p.name} (вы)` : p.name }))}
            />
            <SelectField
              label="Приоритет"
              size="sm"
              value={issue.priority}
              onChange={quickUpdate("priority")}
              disabled={savingField === "priority"}
              options={PRIORITIES.map((p) => ({ value: p.id, label: p.label }))}
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              label="Спринт"
              size="sm"
              value={issue.sprintId ?? ""}
              onChange={quickUpdate("sprintId")}
              disabled={savingField === "sprintId" || !can.edit}
              placeholder="Бэклог (без спринта)"
              options={sprintOptions(sprints, issue.sprintId)}
            />
            <SelectField
              label="Версия (исправлено в)"
              size="sm"
              value={issue.fixVersionId ?? ""}
              onChange={quickUpdate("fixVersionId")}
              disabled={savingField === "fixVersionId" || !can.edit}
              placeholder="Без версии"
              options={versions.map((v) => ({ value: v.id, label: v.released ? `${v.name} (выпущена)` : v.name }))}
            />
          </div>
          <div className="mt-3">
            <BranchButton issue={issue} />
          </div>

          <section aria-labelledby="issue-desc" className="mt-6">
            <h3 id="issue-desc" className="text-sm font-semibold text-ink">
              Описание
            </h3>
            {issue.description ? (
              <RichText body={issue.description} className="mt-2" />
            ) : (
              <p className="mt-2 text-sm text-ink-subtlest">
                Описания нет.{" "}
                <button type="button" onClick={() => onEdit(issue)} className="rounded-sm text-ink-brand hover:underline">
                  Добавить
                </button>
              </p>
            )}
          </section>

          <IssueSubtasks issue={issue} />
          <IssueAttachments issue={issue} />
          <IssueDocs issue={issue} />
          <IssueTimeTracking issue={issue} onUpdate={onUpdate} />

          <section aria-labelledby="issue-details" className="mt-6 rounded-lg border border-line px-4 py-2">
            <h3 id="issue-details" className="sr-only">
              Детали
            </h3>
            <dl className="divide-y divide-line">
              <Row label="Исполнитель">
                <PersonLabel person={assignee} />
              </Row>
              <Row label="Автор">
                <PersonLabel person={reporter ?? { name: "—", email: "" }} />
              </Row>
              <Row label="Родитель">
                {byId[issue.parentId] ? (
                  <button type="button" className="rounded-sm text-left text-ink-brand hover:underline" onClick={() => openIssue(byId[issue.parentId].key)}>
                    {byId[issue.parentId].key} · {byId[issue.parentId].title}
                  </button>
                ) : (
                  <span className="text-ink-subtlest">—</span>
                )}
              </Row>
              <Row label="Спринт">{sprintById[issue.sprintId]?.name ?? <span className="text-ink-subtlest">Бэклог</span>}</Row>
              <Row label="Версия">{versionById[issue.fixVersionId]?.name ?? <span className="text-ink-subtlest">—</span>}</Row>
              <Row label="Команда">{team ? team.name : <span className="text-ink-subtlest">Без команды</span>}</Row>
              <Row label="Начало">{issue.startDate ? formatDate(issue.startDate) : <span className="text-ink-subtlest">—</span>}</Row>
              <Row label="Срок">
                <DueDate issue={issue} />
              </Row>
              <Row label="Оценка">{issue.points ?? <span className="text-ink-subtlest">—</span>}</Row>
              <Row label="Создана">{formatDateTime(issue.createdAt)}</Row>
              <Row label="Обновлена">{formatDateTime(issue.updatedAt)}</Row>
              {issue.completedAt && <Row label="Выполнена">{formatDateTime(issue.completedAt)}</Row>}
            </dl>
          </section>

          <IssueComments issue={issue} />
        </div>
      )}
    </Drawer>
  );
}
