export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export function plural(n, [one, few, many]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const countLabel = (n, forms) => `${n} ${plural(n, forms)}`;

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const dateFullFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const toDate = (v) => {
  if (v instanceof Date) return v;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(v);
};

export const formatDate = (v) => (v ? dateFmt.format(toDate(v)) : "—");
export const formatDateFull = (v) => (v ? dateFullFmt.format(toDate(v)) : "—");
export const formatDateTime = (v) => (v ? dateTimeFmt.format(toDate(v)) : "—");

export function toISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isOverdue(issue) {
  if (!issue.dueDate || issue.status === "done") return false;
  return issue.dueDate < toISODate();
}

const AVATAR_COLORS = ["#1868db", "#5e4db2", "#216e4e", "#ae2e24", "#a54800", "#206a83", "#943d73", "#505258"];
export function avatarColor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const rtf = new Intl.RelativeTimeFormat("ru-RU", { numeric: "auto" });

export function timeAgo(v) {
  const diff = (Date.now() - new Date(v).getTime()) / 1000;
  if (diff < 45) return "только что";
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  if (diff < 7 * 86400) return rtf.format(-Math.round(diff / 86400), "day");
  return formatDate(v);
}
