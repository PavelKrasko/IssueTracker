import { useMemo, useState } from "react";
import { AttachmentDropzone } from "@/components/attachments/AttachmentDropzone";
import { DocGrid, DocTable } from "@/components/docs/DocList";
import { Icon } from "@/components/icons";
import { Button, EmptyState, PageHeader, SearchInput, SelectField, Skeleton } from "@/components/ui";
import { DOC_ACCEPT, DOC_CATEGORIES, DOC_MAX_SIZE } from "@/constants/docs";
import { useDocuments } from "@/context/DocumentsContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn, focusRing } from "@/utils/cn";
import { formatBytes } from "@/utils/files";
import { countLabel } from "@/utils/format";

const SORTS = [
  { value: "new", label: "Сначала новые" },
  { value: "old", label: "Сначала старые" },
  { value: "name", label: "По названию" },
  { value: "size", label: "По размеру" },
];

const DROP_HINT = `PDF, Word, Excel, PowerPoint, Markdown, изображения, ZIP — до ${formatBytes(DOC_MAX_SIZE)}.`;

export default function DocsPage() {
  const { docs, status, error, reload, openUpload, openLink } = useDocuments();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("new");
  const [view, setView] = useLocalStorage("it_docs_view", "list");

  const counts = useMemo(() => {
    const c = { all: docs.length };
    for (const d of docs) c[d.category] = (c[d.category] ?? 0) + 1;
    return c;
  }, [docs]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = docs.filter(
      (d) => (category === "all" || d.category === category) && (!s || d.name.toLowerCase().includes(s) || (d.description ?? "").toLowerCase().includes(s))
    );
    const by = {
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      old: (a, b) => a.createdAt.localeCompare(b.createdAt),
      name: (a, b) => a.name.localeCompare(b.name, "ru", { numeric: true }),
      size: (a, b) => (b.size ?? 0) - (a.size ?? 0),
    }[sort];
    return [...list].sort(by);
  }, [docs, q, category, sort]);

  const chip = (id, label) => (
    <button
      key={id}
      type="button"
      aria-pressed={category === id}
      onClick={() => setCategory(id)}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors duration-fast",
        category === id ? "bg-brand text-ink-inverse" : "bg-neutral text-ink hover:bg-neutral-hover",
        focusRing
      )}
    >
      {label}
      <span className={cn("text-xs", category === id ? "text-ink-inverse/80" : "text-ink-subtle")}>{counts[id] ?? 0}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Документы"
        subtitle={status === "ready" && docs.length ? `${countLabel(docs.length, ["документ", "документа", "документов"])} в проекте` : "Требования, схемы, инструкции и ссылки на внешнюю документацию"}
        actions={
          <>
            <Button variant="outline" iconBefore="link" onClick={() => openLink()}>
              Добавить ссылку
            </Button>
            <Button variant="primary" iconBefore="upload" onClick={() => openUpload()}>
              Загрузить файлы
            </Button>
          </>
        }
      />

      {status === "loading" && (
        <div role="status" aria-label="Загрузка документов" className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {status === "error" && (
        <EmptyState role="alert" tone="danger" icon="alert" title="Не удалось загрузить документы" action={<Button variant="primary" onClick={reload}>Повторить</Button>}>
          {error}
        </EmptyState>
      )}

      {status === "ready" && docs.length === 0 && (
        <div className="flex flex-col gap-4">
          <AttachmentDropzone onFiles={(files) => openUpload({ files })} accept={DOC_ACCEPT} what="файлы документации" icon="folder" pasteHint={false} hint={DROP_HINT} remaining={20} />
          <EmptyState compact icon="docs" title="Документов пока нет">
            Загрузите файлы или добавьте ссылку на Confluence, Google Docs или Figma. Документ можно привязать к задаче.
          </EmptyState>
        </div>
      )}

      {status === "ready" && docs.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <SearchInput value={q} onChange={setQ} label="Поиск документов" placeholder="Название или описание" className="w-full sm:w-64" />
            <SelectField label="Сортировка" labelHidden size="sm" className="w-44" value={sort} onChange={(e) => setSort(e.target.value)} options={SORTS} />
            <div role="group" aria-label="Вид" className="ml-auto flex rounded-sm bg-neutral p-0.5">
              {[
                ["list", "Список", "viewList"],
                ["grid", "Плитки", "viewGrid"],
              ].map(([id, label, icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-xs px-2 text-sm font-medium transition-colors duration-fast",
                    view === id ? "bg-surface-raised text-ink-brand shadow-raised" : "text-ink-subtle hover:text-ink",
                    focusRing
                  )}
                >
                  <Icon name={icon} />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div role="group" aria-label="Категории" className="flex flex-wrap gap-2">
            {chip("all", "Все")}
            {DOC_CATEGORIES.filter((c) => counts[c.id]).map((c) => chip(c.id, c.label))}
          </div>

          <AttachmentDropzone onFiles={(files) => openUpload({ files })} accept={DOC_ACCEPT} what="файлы" icon="upload" pasteHint={false} compact hint={DROP_HINT} remaining={20} />

          {shown.length === 0 ? (
            <EmptyState
              compact
              icon="search"
              title="Ничего не найдено"
              action={
                <Button
                  onClick={() => {
                    setQ("");
                    setCategory("all");
                  }}
                >
                  Показать все документы
                </Button>
              }
            >
              {q ? `Нет документов по запросу «${q}».` : "В этой категории пока пусто."}
            </EmptyState>
          ) : view === "grid" ? (
            <DocGrid docs={shown} />
          ) : (
            <DocTable docs={shown} />
          )}
        </>
      )}
    </div>
  );
}
