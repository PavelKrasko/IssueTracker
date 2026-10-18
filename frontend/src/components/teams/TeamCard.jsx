import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/icons";
import { Avatar, AvatarGroup, Button, IconButton, Menu, SelectField, TextField } from "@/components/ui";
import { useProject } from "@/context/ProjectContext";
import { useToast } from "@/context/ToastContext";
import { cn, focusRing } from "@/utils/cn";
import { countLabel } from "@/utils/format";

function AddMemberForm({ team, onAdd, onCancel }) {
  const { people } = useProject();
  const candidates = people.filter((p) => !team.members.some((m) => m.id === p.id));
  const [userId, setUserId] = useState(candidates[0]?.id ?? "");
  const [role, setRole] = useState("");
  const [error, setError] = useState();
  const [saving, setSaving] = useState(false);

  if (!candidates.length) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-surface-sunken p-3 text-sm text-ink-subtle">
        Все участники проекта уже в команде.
        <Link to="/app/project" className={cn("rounded-sm font-semibold text-ink-brand hover:underline", focusRing)}>
          Пригласить в проект
        </Link>
        <Button variant="subtle" size="sm" className="ml-auto" onClick={onCancel}>
          Готово
        </Button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) return setError("Выберите участника.");
    setSaving(true);
    try {
      await onAdd({ userId, role }, candidates.find((c) => c.id === userId));
      setRole("");
      setUserId(candidates.find((c) => c.id !== userId)?.id ?? "");
    } catch (err) {
      setError(err.fields?.userId ?? err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mt-3 flex flex-col gap-3 rounded-md bg-surface-sunken p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Участник проекта"
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            setError(undefined);
          }}
          error={error}
          disabled={saving}
          options={candidates.map((c) => ({ value: c.id, label: `${c.name} — ${c.email}` }))}
        />
        <TextField label="Роль в команде" optional value={role} maxLength={60} onChange={(e) => setRole(e.target.value)} disabled={saving} placeholder="Например: QA" />
      </div>
      <p className="text-xs text-ink-subtle">
        Нужного человека нет в списке?{" "}
        <Link to="/app/project" className={cn("rounded-sm text-ink-brand hover:underline", focusRing)}>
          Пригласите его в проект
        </Link>
        .
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="subtle" onClick={onCancel} disabled={saving}>
          Готово
        </Button>
        <Button type="submit" variant="primary" iconBefore="userPlus" loading={saving}>
          Добавить
        </Button>
      </div>
    </form>
  );
}

export function TeamCard({ team, openIssues, onEdit, onDelete, onAddMember, onRemoveMember, canManage }) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const panelId = useId();

  const remove = async (m) => {
    setRemoving(m.id);
    try {
      await onRemoveMember(m.id);
      toast(`${m.name} больше не в команде «${team.name}»`);
    } catch (e) {
      toast(e.message, { tone: "error" });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <li className="flex flex-col rounded-lg border border-line bg-surface-raised">
      <div className="flex items-start gap-3 p-4">
        <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-discovery-subtle text-discovery-text">
          <Icon name="users" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-ink">{team.name}</h2>
          {team.description ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-ink-subtle">{team.description}</p>
          ) : (
            <p className="mt-0.5 text-sm text-ink-subtlest">Без описания</p>
          )}
        </div>
        {canManage && <Menu
          items={[
            { label: "Изменить", icon: "edit", onSelect: onEdit },
            { label: "Удалить команду", icon: "trash", tone: "danger", onSelect: onDelete, separatorBefore: true },
          ]}
          renderTrigger={({ ref, props }) => <IconButton ref={ref} icon="more" label={`Действия с командой «${team.name}»`} {...props} />}
        />}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-sm text-ink-subtle">
        {team.members.length > 0 ? <AvatarGroup people={team.members} /> : null}
        <span>{countLabel(team.members.length, ["участник", "участника", "участников"])}</span>
        <span>{countLabel(openIssues, ["открытая задача", "открытые задачи", "открытых задач"])}</span>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((v) => !v)}
          className={cn("ml-auto inline-flex items-center gap-1 rounded-sm px-1 font-medium text-ink-brand hover:underline", focusRing)}
        >
          {expanded ? "Скрыть участников" : "Участники"}
          <Icon name="chevronDown" className={cn("h-4 w-4 transition-transform duration-fast", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded && (
        <div id={panelId} className="border-t border-line px-4 py-3">
          {team.members.length === 0 ? (
            <p className="text-sm text-ink-subtlest">В команде пока никого нет.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {team.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2">
                  <Avatar person={m} size="md" decorative />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {m.name}
                      {m.role && <span className="text-ink-subtle"> · {m.role}</span>}
                    </p>
                    <p className="truncate text-xs text-ink-subtle">{m.email}</p>
                  </div>
                  {canManage && <IconButton
                    icon={removing === m.id ? "clock" : "x"}
                    label={`Убрать ${m.name} из команды`}
                    variant="danger"
                    disabled={removing === m.id}
                    onClick={() => remove(m)}
                  />}
                </li>
              ))}
            </ul>
          )}
          {!canManage ? null : adding ? (
            <AddMemberForm
              team={team}
              onAdd={async (data, person) => {
                await onAddMember(data);
                toast(`${person.name} добавлен(а) в «${team.name}»`);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <Button variant="subtle" iconBefore="userPlus" className="mt-2 -ml-2" onClick={() => setAdding(true)}>
              Добавить участника
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
