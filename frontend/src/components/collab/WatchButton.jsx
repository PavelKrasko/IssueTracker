import { useState } from "react";
import { watchersApi } from "@/api/collabApi";
import { AvatarGroup, Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useIssues } from "@/context/IssuesContext";
import { useProject } from "@/context/ProjectContext";
import { useTeams } from "@/context/TeamsContext";
import { useToast } from "@/context/ToastContext";
import { countLabel } from "@/utils/format";

export function WatchButton({ issue }) {
  const { user } = useAuth();
  const { current } = useProject();
  const { personById } = useTeams();
  const { patchLocal } = useIssues();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const watching = issue.watchers.includes(user.id);
  const people = issue.watchers.map((id) => personById[id]).filter(Boolean);

  const toggle = async () => {
    setBusy(true);
    try {
      const res = watching ? await watchersApi.unwatch(current.id, issue.id) : await watchersApi.watch(current.id, issue.id);
      patchLocal(issue.id, { watchers: res.watchers });
      toast(watching ? "Вы больше не следите за задачей" : "Вы следите за задачей — уведомления о комментариях и статусе придут вам");
    } catch (e) {
      toast(e.message, { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={watching ? "default" : "subtle"}
        iconBefore={watching ? "eye" : "eyeOff"}
        onClick={toggle}
        loading={busy}
        aria-pressed={watching}
        title={watching ? "Перестать следить" : "Следить: уведомления о комментариях и смене статуса"}
      >
        {watching ? "Вы следите" : "Следить"}
      </Button>
      {people.length > 0 && <AvatarGroup people={people} max={4} size="xs" label={`Следят: ${people.map((p) => p.name).join(", ")}`} />}
      <span className="sr-only">{countLabel(people.length, ["наблюдатель", "наблюдателя", "наблюдателей"])}</span>
    </div>
  );
}
