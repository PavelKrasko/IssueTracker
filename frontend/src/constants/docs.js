export const DOC_CATEGORIES = [
  { id: "requirements", label: "Требования" },
  { id: "architecture", label: "Архитектура" },
  { id: "api", label: "API" },
  { id: "design", label: "Дизайн" },
  { id: "guides", label: "Инструкции" },
  { id: "other", label: "Прочее" },
];
export const DOC_CATEGORY_BY_ID = Object.fromEntries(DOC_CATEGORIES.map((c) => [c.id, c]));

export const DOC_MAX_SIZE = 20 * 1024 * 1024;
export const DOC_EXTENSIONS = ["pdf", "doc", "docx", "odt", "rtf", "txt", "md", "xls", "xlsx", "ods", "csv", "ppt", "pptx", "odp", "png", "jpg", "jpeg", "gif", "webp", "svg", "zip", "json", "yaml", "yml"];
export const DOC_ACCEPT = DOC_EXTENSIONS.map((e) => `.${e}`).join(",");

const KINDS = [
  { ext: ["pdf"], icon: "fileText", color: "text-danger", label: "PDF" },
  { ext: ["doc", "docx", "odt", "rtf"], icon: "fileText", color: "text-ink-brand", label: "Документ" },
  { ext: ["txt", "md"], icon: "fileText", color: "text-ink-subtle", label: "Текст" },
  { ext: ["xls", "xlsx", "ods", "csv"], icon: "fileSheet", color: "text-success", label: "Таблица" },
  { ext: ["ppt", "pptx", "odp"], icon: "fileSlides", color: "text-warning-text", label: "Презентация" },
  { ext: ["png", "jpg", "jpeg", "gif", "webp", "svg"], icon: "fileImage", color: "text-discovery-text", label: "Изображение" },
  { ext: ["zip"], icon: "fileArchive", color: "text-ink-subtle", label: "Архив" },
  { ext: ["json", "yaml", "yml"], icon: "fileCode", color: "text-ink-subtle", label: "Код" },
];

export const extOf = (name = "") => (name.includes(".") ? name.split(".").pop().toLowerCase() : "");

export function docKind(doc) {
  if (doc.kind === "link") return { icon: "link", color: "text-ink-brand", label: "Ссылка" };
  const ext = extOf(doc.name);
  return KINDS.find((k) => k.ext.includes(ext)) ?? { icon: "file", color: "text-ink-subtle", label: ext ? ext.toUpperCase() : "Файл" };
}

export const isViewable = (doc) => doc.kind === "link" || ["pdf", "txt", "md", "csv", "png", "jpg", "jpeg", "gif", "webp", "json", "yaml", "yml"].includes(extOf(doc.name));
