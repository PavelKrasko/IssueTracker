import { useMemo, useState } from "react";
import { TeamCard } from "@/components/teams/TeamCard";
import { TeamFormModal } from "@/components/teams/TeamFormModal";
import { Button, ConfirmDialog, EmptyState, PageHeader, SearchInput, Skeleton } from "@/components/ui";
import { useIssues } from "@/context/IssuesContext";
import { useTeams } from "@/context/TeamsContext";
import { useProject } from "@/context/ProjectContext";
import { useToast } from "@/context/ToastContext";
import { countLabel } from "@/utils/format";

export default function TeamsPage() {
  const { teams, status, error, reload, createTeam, updateTeam, deleteTeam, addMember, removeMember } = useTeams();
  const { issues } = useIssues();
  const toast = useToast();
  const { can } = useProject();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const openByTeam = useMemo(() => {
    const map = {};
    for (const i of issues) if (i.teamId && i.status !== "done") map[i.teamId] = (map[i.teamId] ?? 0) + 1;
    return map;
  }, [issues]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(s) || t.members.some((m) => m.name.toLowerCase().includes(s) || m.email.includes(s)));
  }, [teams, q]);

  const submitTeam = async (data) => {
    if (editing === "new") {
      const t = await createTeam(data);
      toast(`Команда «${t.name}» создана`);
    } else {
      const t = await updateTeam(editing.id, data);
      toast(`Команда «${t.name}» сохранена`);
    }
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Команды"
        subtitle={status === "ready" && teams.length ? countLabel(teams.length, ["команда", "команды", "команд"]) : "Группы участников проекта"}
        actions={
          can.admin && (
            <Button variant="primary" iconBefore="plus" onClick={() => setEditing("new")}>
              Создать команду
            </Button>
          )
        }
      />

      {status === "loading" && (
        <div role="status" aria-label="Загрузка команд" className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      )}

      {status === "error" && (
        <EmptyState role="alert" tone="danger" icon="alert" title="Не удалось загрузить команды" action={<Button variant="primary" onClick={reload}>Повторить</Button>}>
          {error}
        </EmptyState>
      )}

      {status === "ready" && teams.length === 0 && (
        <EmptyState icon="users" title="Команд пока нет" action={can.admin && <Button variant="primary" iconBefore="plus" onClick={() => setEditing("new")}>Создать команду</Button>}>
          Команды группируют участников проекта: например, Frontend, Backend, QA.
        </EmptyState>
      )}

      {status === "ready" && teams.length > 0 && (
        <>
          <SearchInput value={q} onChange={setQ} label="Поиск по командам и участникам" className="w-full sm:w-72" />
          {filtered.length === 0 ? (
            <EmptyState compact icon="search" title="Ничего не найдено" action={<Button onClick={() => setQ("")}>Очистить поиск</Button>}>
              Нет команд и участников по запросу «{q}».
            </EmptyState>
          ) : (
            <ul className="grid items-start gap-4 md:grid-cols-2">
              {filtered.map((t) => (
                <TeamCard
                  key={t.id}
                  team={t}
                  openIssues={openByTeam[t.id] ?? 0}
                  onEdit={() => setEditing(t)}
                  onDelete={() => setToDelete(t)}
                  onAddMember={(data) => addMember(t.id, data)}
                  onRemoveMember={(memberId) => removeMember(t.id, memberId)}
                  canManage={can.admin}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {editing && <TeamFormModal open team={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSubmit={submitTeam} />}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          await deleteTeam(toDelete.id);
          toast(`Команда «${toDelete.name}» удалена`);
        }}
        title={toDelete ? `Удалить команду «${toDelete.name}»?` : ""}
        description="Задачи команды останутся, но будут без команды. Участники останутся в проекте."
        confirmLabel="Удалить команду"
      />
    </div>
  );
}
