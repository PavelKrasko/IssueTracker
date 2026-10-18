import { toISODate } from "./format";

const DAY = 86_400_000;

export function parseISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export const diffDays = (a, b) => Math.round((b - a) / DAY);

export const addDaysISO = (iso, n) => toISODate(addDays(parseISO(iso), n));

export function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}
export const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
export const startOfQuarter = (date) => new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);

export function nextUnit(date, unit) {
  if (unit === "day") return addDays(date, 1);
  if (unit === "week") return addDays(date, 7);
  if (unit === "month") return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return new Date(date.getFullYear(), date.getMonth() + 3, 1);
}

export function startOfUnit(date, unit) {
  if (unit === "week") return startOfWeek(date);
  if (unit === "month") return startOfMonth(date);
  if (unit === "quarter") return startOfQuarter(date);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const ROMAN = ["I", "II", "III", "IV"];

export const monthLabel = (d) => `${MONTHS[d.getMonth()][0].toUpperCase()}${MONTHS[d.getMonth()].slice(1)} ${d.getFullYear()}`;
export const monthShort = (d) => MONTHS_SHORT[d.getMonth()];
export const quarterLabel = (d) => `${ROMAN[Math.floor(d.getMonth() / 3)]} кв. ${d.getFullYear()}`;
export const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
