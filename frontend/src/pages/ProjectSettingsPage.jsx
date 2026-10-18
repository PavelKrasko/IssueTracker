import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectFields } from "@/components/projects/ProjectForm";
import { Avatar, Button, Card, CardHeader, ConfirmDialog, IconButton, PageHeader, SelectField, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS, useProject } from "@/context/ProjectContext";
import { useToast } from "@/context/ToastContext";
import { formatDate } from "@/utils/format";
import { validateEmail } from "@/utils/validation";

const ROLE_HELP = [
  ["owner", "Всё, включая удаление проекта и назначение администраторов."],
  ["admin", "Участники, роли, команды и настройки проекта."],
  ["member", "Создаёт и редактирует задачи, вложения и документы."],
  ["viewer", "Только просмотр."],
];

function InviteForm() {
  const { addMember, can } = useProject();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState();
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setError(err);
      ref.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const res = await addMember({ email: email.trim(), role });
      toast(res.status === "added" ? `${res.member.name} добавлен(а) в проект` : `Приглашение для ${res.invite.email} создано — сработает после регистрации`);
      setEmail("");
    } catch (e2) {
      setError(e2.fields?.email ?? e2.message);
      ref.current?.focus();
    } finally {
      setSaving(false);
    }
  };

  const roles = ["member", "viewer", ...(can.owner ? ["admin"] : [])];

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-[1fr_11rem_auto] sm:items-start">
      <TextField
        ref={ref}
        label="Email"
        type="email"
        inputMode="email"
        placeholder="colleague@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(undefined);
        }}
        error={error}
        disabled={saving}
      />
      <SelectField label="Роль" value={role} onChange={(e) => setRole(e.target.value)} disabled={saving} options={roles.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
      <Button type="submit" variant="primary" iconBefore="userPlus" loading={saving} className="sm:mt-5">
        Пригласить
      </Button>
    </form>
  );
}

export default function ProjectSettingsPage() {
  const { user } = useAuth();
  const { current, can, members, invites, updateProject, updateRole, removeMember, deleteInvite, deleteProject, leaveProject } = useProject();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null);

  const changeRole = async (m, role) => {
    try {
      await updateRole(m.id, role);
      toast(`${m.name}: ${ROLE_LABELS[role].toLowerCase()}`);
    } catch (e) {
      toast(e.message, { tone: "error" });
    }
  };

  const editableRoles = (m) => {
    if (!can.admin || m.role === "owner" || m.id === user.id) return null;
    if (m.role === "admin" && !can.owner) return null;
    return ["member", "viewer", ...(can.owner ? ["admin"] : [])];
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader eyebrow={`Проект ${current.key}`} title="Настройки проекта" subtitle={`Ваша роль: ${ROLE_LABELS[current.role]}`} />

      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Основное</h2>
        <ProjectFields
          key={current.id}
          initial={current}
          keyEditable={false}
          readOnly={!can.admin}
          submitLabel="Сохранить"
          onSubmit={async (data) => {
            await updateProject(current.id, data);
            toast("Проект сохранён");
          }}
        />
      </Card>

      <Card>
        <CardHeader title={`Участники (${members.length})`} description="Исполнителем задачи и участником команды может быть только участник проекта." />
        <div className="flex flex-col gap-4 px-4 pb-4 pt-3 sm:px-5">
          {can.admin && <InviteForm />}

          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
            {members.map((m) => {
              const roles = editableRoles(m);
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <Avatar person={m} size="md" decorative />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {m.name}
                      {m.id === user.id && <span className="text-ink-subtle"> (вы)</span>}
                    </p>
                    <p className="truncate text-xs text-ink-subtle">{m.email}</p>
                  </div>
                  {roles ? (
                    <SelectField
                      label={`Роль: ${m.name}`}
                      labelHidden
                      size="sm"
                      className="w-44"
                      value={m.role}
                      onChange={(e) => changeRole(m, e.target.value)}
                      options={roles.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                    />
                  ) : (
                    <span className="rounded-sm bg-neutral px-2 py-0.5 text-xs text-ink-subtle">{ROLE_LABELS[m.role]}</span>
                  )}
                  {roles && <IconButton icon="trash" variant="danger" label={`Исключить ${m.name} из проекта`} onClick={() => setConfirm({ kind: "remove", member: m })} />}
                </li>
              );
            })}
          </ul>

          {can.admin && invites.length > 0 && (
            <section aria-labelledby="invites">
              <h3 id="invites" className="text-xs font-semibold text-ink-subtle">
                Ожидают регистрации ({invites.length})
              </h3>
              <ul className="mt-2 flex flex-col divide-y divide-line rounded-lg border border-dashed border-line">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{i.email}</p>
                      <p className="text-xs text-ink-subtle">
                        {ROLE_LABELS[i.role]} · приглашён(а) {formatDate(i.createdAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="subtle"
                      onClick={async () => {
                        await deleteInvite(i.id);
                        toast(`Приглашение для ${i.email} отменено`);
                      }}
                    >
                      Отменить
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <dl className="grid gap-2 rounded-lg bg-surface-sunken p-3 text-xs sm:grid-cols-2">
            {ROLE_HELP.map(([role, text]) => (
              <div key={role}>
                <dt className="font-semibold text-ink">{ROLE_LABELS[role]}</dt>
                <dd className="text-ink-subtle">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <Card className="border-danger/40">
        <CardHeader title="Опасная зона" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-3 sm:px-5">
          <p className="max-w-prose text-sm text-ink-subtle">
            {can.owner
              ? "Удаление проекта сотрёт все задачи, команды, вложения и документы. Действие необратимо."
              : "Вы потеряете доступ к задачам и документам проекта. Вернуться можно только по новому приглашению."}
          </p>
          <Button variant="danger" iconBefore={can.owner ? "trash" : "logOut"} onClick={() => setConfirm({ kind: can.owner ? "delete" : "leave" })}>
            {can.owner ? "Удалить проект" : "Покинуть проект"}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={
          confirm?.kind === "remove"
            ? `Исключить ${confirm.member.name}?`
            : confirm?.kind === "delete"
              ? `Удалить проект «${current.name}»?`
              : `Покинуть проект «${current.name}»?`
        }
        description={
          confirm?.kind === "remove"
            ? "Его задачи станут «Не назначено», он пропадёт из команд проекта."
            : confirm?.kind === "delete"
              ? "Все задачи, команды, вложения и документы будут удалены без возможности восстановления."
              : "Доступ к проекту пропадёт сразу."
        }
        confirmLabel={confirm?.kind === "remove" ? "Исключить" : confirm?.kind === "delete" ? "Удалить проект" : "Покинуть"}
        onConfirm={async () => {
          if (confirm.kind === "remove") {
            await removeMember(confirm.member.id);
            toast(`${confirm.member.name} исключён(а) из проекта`);
          } else if (confirm.kind === "delete") {
            await deleteProject(current.id);
            toast("Проект удалён");
            navigate("/app/board", { replace: true });
          } else {
            await leaveProject(current.id);
            toast("Вы покинули проект");
            navigate("/app/board", { replace: true });
          }
        }}
      />
    </div>
  );
}
