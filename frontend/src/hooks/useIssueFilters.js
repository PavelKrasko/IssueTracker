import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PRIORITY_BY_ID } from "@/constants/issues";

const LIST_KEYS = ["assignee", "type", "priority", "status", "team", "sprint", "version"];

export function useIssueFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      q: params.get("q") ?? "",
      mine: params.get("mine") === "1",
      overdue: params.get("overdue") === "1",
      ...Object.fromEntries(LIST_KEYS.map((k) => [k, params.get(k)?.split(",").filter(Boolean) ?? []])),
    }),
    [params]
  );

  const setFilter = useCallback(
    (key, value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const empty = value === "" || value === false || value == null || (Array.isArray(value) && value.length === 0);
          if (empty) next.delete(key);
          else next.set(key, Array.isArray(value) ? value.join(",") : value === true ? "1" : String(value));
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const toggleInList = useCallback(
    (key, id) => {
      const current = filters[key];
      setFilter(key, current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
    },
    [filters, setFilter]
  );

  const reset = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams();

        if (prev.get("issue")) next.set("issue", prev.get("issue"));
        return next;
      },
      { replace: true }
    );
  }, [setParams]);

  const activeCount =
    (filters.q ? 1 : 0) + (filters.mine ? 1 : 0) + (filters.overdue ? 1 : 0) + LIST_KEYS.reduce((n, k) => n + filters[k].length, 0);

  return { filters, setFilter, toggleInList, reset, activeCount };
}

export function applyIssueFilters(issues, filters, { meId, todayISO, activeSprintId = null }) {
  const q = filters.q.trim().toLowerCase();
  return issues.filter((i) => {
    if (q && !i.title.toLowerCase().includes(q) && !i.key.toLowerCase().includes(q) && !(i.description ?? "").toLowerCase().includes(q)) return false;
    if (filters.mine && i.assigneeId !== meId) return false;
    if (filters.overdue && !(i.dueDate && i.status !== "done" && i.dueDate < todayISO)) return false;
    if (filters.assignee.length) {
      const id = i.assigneeId ?? "none";
      if (!filters.assignee.includes(id)) return false;
    }
    if (filters.type.length && !filters.type.includes(i.type)) return false;
    if (filters.priority.length && !filters.priority.includes(i.priority)) return false;
    if (filters.status.length && !filters.status.includes(i.status)) return false;
    if (filters.team.length && !filters.team.includes(i.teamId ?? "none")) return false;
    if (filters.sprint.length) {
      const sid = i.sprintId ?? "none";
      const ok = filters.sprint.includes(sid) || (activeSprintId && sid === activeSprintId && filters.sprint.includes("active"));
      if (!ok) return false;
    }
    if (filters.version.length && !filters.version.includes(i.fixVersionId ?? "none")) return false;
    return true;
  });
}

export const priorityWeight = (id) => PRIORITY_BY_ID[id]?.weight ?? 0;
