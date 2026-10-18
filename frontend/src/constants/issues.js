export const PROJECT = { key: "IT", name: "IssueTracker" };

export const STATUSES = [
  { id: "todo", label: "К выполнению", lozenge: "bg-neutral text-ink-subtle", chart: "stroke-chart-1", dot: "bg-chart-1" },
  { id: "in_progress", label: "В работе", lozenge: "bg-brand-subtle text-ink-brand", chart: "stroke-chart-2", dot: "bg-chart-2" },
  { id: "review", label: "На проверке", lozenge: "bg-discovery-subtle text-discovery-text", chart: "stroke-chart-3", dot: "bg-chart-3" },
  { id: "done", label: "Готово", lozenge: "bg-success-subtle text-success-text", chart: "stroke-chart-4", dot: "bg-chart-4" },
];

export const TYPES = [
  { id: "task", label: "Задача", icon: "check", bg: "bg-brand" },
  { id: "bug", label: "Баг", icon: "bug", bg: "bg-danger" },
  { id: "story", label: "История", icon: "bookmark", bg: "bg-success" },
];

export const PRIORITIES = [
  { id: "highest", label: "Наивысший", icon: "chevronsUp", color: "text-danger", weight: 4 },
  { id: "high", label: "Высокий", icon: "chevronUp", color: "text-danger", weight: 3 },
  { id: "medium", label: "Средний", icon: "equal", color: "text-warning-text", weight: 2 },
  { id: "low", label: "Низкий", icon: "chevronDown", color: "text-ink-brand", weight: 1 },
];

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
export const STATUS_BY_ID = byId(STATUSES);
export const TYPE_BY_ID = byId(TYPES);
export const PRIORITY_BY_ID = byId(PRIORITIES);

export const TITLE_MAX = 255;

export const EMPTY_ISSUE = {
  title: "",
  description: "",
  type: "task",
  status: "todo",
  priority: "medium",
  assigneeId: "",
  teamId: "",
  startDate: "",
  dueDate: "",
  points: "",
  parentId: "",
  sprintId: "",
  fixVersionId: "",
  estimateMinutes: "",
};
