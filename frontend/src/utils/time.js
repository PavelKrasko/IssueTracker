export function formatMinutes(min) {
  if (min == null) return "—";
  const m = Math.round(min);
  if (m === 0) return "0м";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (!h) return `${rest}м`;
  return rest ? `${h}ч ${rest}м` : `${h}ч`;
}

export function parseDuration(input) {
  const s = String(input ?? "").trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  const colon = s.match(/^(\d+):(\d{1,2})$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  const re = /(\d+(?:\.\d+)?)\s*(ч|h|час[а-я]*|д|d|м|m|мин[а-я]*)/g;
  let total = 0;
  let matched = "";
  let m;
  while ((m = re.exec(s))) {
    const n = Number(m[1]);
    const u = m[2][0];
    total += u === "ч" || u === "h" ? n * 60 : u === "д" || u === "d" ? n * 8 * 60 : n;
    matched += m[0];
  }
  if (!matched || s.replace(/\s+/g, "").length !== matched.replace(/\s+/g, "").length) return null;
  return Math.round(total);
}
