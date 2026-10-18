import { toISODate } from "@/utils/format";
import {
  addDays,
  diffDays,
  isWeekend,
  monthLabel,
  monthShort,
  nextUnit,
  parseISO,
  quarterLabel,
  startOfUnit,
  today,
} from "@/utils/dates";

export const MODES = {
  weeks: { label: "Недели", dayW: 36, top: "month", bottom: "day", pad: 10, minDays: 42 },
  months: { label: "Месяцы", dayW: 10, top: "month", bottom: "week", pad: 21, minDays: 180 },
  quarters: { label: "Кварталы", dayW: 3.5, top: "quarter", bottom: "month", pad: 45, minDays: 400 },
};

export function issueSpan(issue) {
  const start = issue.startDate ?? issue.dueDate;
  const end = issue.dueDate ?? issue.startDate;
  if (!start) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

export function computeRange(spans, modeId) {
  const mode = MODES[modeId];
  const now = today();
  let min = now;
  let max = now;
  for (const s of spans) {
    const a = parseISO(s.start);
    const b = parseISO(s.end);
    if (a < min) min = a;
    if (b > max) max = b;
  }
  const start = startOfUnit(addDays(min, -mode.pad), mode.top);
  let end = addDays(max, mode.pad);
  if (diffDays(start, end) < mode.minDays) end = addDays(start, mode.minDays);
  end = nextUnit(startOfUnit(end, mode.top), mode.top);
  return { start, end, days: diffDays(start, end) };
}

export function segments(range, unit) {
  const out = [];
  let cur = startOfUnit(range.start, unit);
  while (cur < range.end) {
    const next = nextUnit(cur, unit);
    const from = Math.max(0, diffDays(range.start, cur));
    const to = Math.min(range.days, diffDays(range.start, next));
    out.push({ key: toISODate(cur), from, len: to - from, date: cur, label: labelFor(cur, unit), weekend: unit === "day" && isWeekend(cur) });
    cur = next;
  }
  return out;
}

function labelFor(d, unit) {
  if (unit === "day") return String(d.getDate());
  if (unit === "week") return `${d.getDate()} ${monthShort(d)}`;
  if (unit === "month") return monthLabel(d);
  return quarterLabel(d);
}

export const monthShortLabel = (d) => monthShort(d);
