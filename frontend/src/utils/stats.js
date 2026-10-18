import { PRIORITIES, STATUSES } from "@/constants/issues";
import { formatDate, isOverdue, toISODate } from "./format";

export function computeStats(issues, { days = 14, personById = {} } = {}) {
  const total = issues.length;
  const done = issues.filter((i) => i.status === "done").length;
  const inProgress = issues.filter((i) => i.status === "in_progress" || i.status === "review").length;
  const overdue = issues.filter(isOverdue).length;
  const open = total - done;

  const byStatus = STATUSES.map((s) => ({
    id: s.id,
    label: s.label,
    value: issues.filter((i) => i.status === s.id).length,
    strokeClass: s.chart,
    dotClass: s.dot,
  }));

  const byPriority = PRIORITIES.map((p) => ({
    id: p.id,
    label: p.label,
    value: issues.filter((i) => i.priority === p.id && i.status !== "done").length,
  }));

  const workloadMap = new Map();
  for (const i of issues) {
    if (i.status === "done") continue;
    const id = i.assigneeId ?? "none";
    workloadMap.set(id, (workloadMap.get(id) ?? 0) + 1);
  }
  const workload = [...workloadMap.entries()]
    .map(([id, value]) => ({
      id,
      value,
      person: id === "none" ? null : personById[id] ?? { name: "Удалённый участник", email: id },
    }))
    .sort((a, b) => b.value - a.value);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const trend = Array.from({ length: days }, (_, k) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - k));
    const iso = toISODate(d);
    return {
      iso,
      label: formatDate(d),
      values: {
        created: issues.filter((i) => toISODate(new Date(i.createdAt)) === iso).length,
        done: issues.filter((i) => i.completedAt && toISODate(new Date(i.completedAt)) === iso).length,
      },
    };
  });

  return {
    total,
    done,
    open,
    inProgress,
    overdue,
    completion: total ? Math.round((done / total) * 100) : 0,
    byStatus,
    byPriority,
    workload,
    trend,
  };
}
