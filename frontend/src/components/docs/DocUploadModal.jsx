import { useMemo, useState } from "react";
import { AttachmentDropzone } from "@/components/attachments/AttachmentDropzone";
import { Icon } from "@/components/icons";
import { Button, FormAlert, IconButton, Modal, SelectField, Spinner, TextareaField } from "@/components/ui";
import { DOC_ACCEPT, DOC_CATEGORIES, DOC_EXTENSIONS, DOC_MAX_SIZE, extOf } from "@/constants/docs";
import { useIssues } from "@/context/IssuesContext";
import { cn } from "@/utils/cn";
import { formatBytes } from "@/utils/files";
import { DocIcon } from "./DocIcon";

const MAX_FILES = 20;

function validateDocs(files, already) {
  const valid = [];
  const errors = [];
  for (const file of files) {
    if (!DOC_EXTENSIONS.includes(extOf(file.name))) errors.push(`«${file.name}» — такой тип файла не поддерживается.`);
    else if (file.size > DOC_MAX_SIZE) errors.push(`«${file.name}» весит ${formatBytes(file.size)}. Максимум — ${formatBytes(DOC_MAX_SIZE)}.`);
    else if (already + valid.length >= MAX_FILES) {
      errors.push(`За раз можно загрузить не больше ${MAX_FILES} файлов.`);
      break;
    } else valid.push(file);
  }
  return { valid, errors };
}

export const issueOptions = (issues) =>
  [...issues]
    .sort((a, b) => a.key.localeCompare(b.key, "ru", { numeric: true }))
    .map((i) => ({ value: i.id, label: `${i.key} — ${i.title.length > 50 ? i.title.slice(0, 50) + "…" : i.title}` }));

export function DocUploadModal({ initialFiles = [], issueId: presetIssueId = "", onClose, onUpload }) {
  const { issues } = useIssues();
  const first = useMemo(() => validateDocs(initialFiles, 0), [initialFiles]);
  const [items, setItems] = useState(() => first.valid.map((file) => ({ key: Math.random().toString(36).slice(2), file, status: "ready" })));
  const [errors, setErrors] = useState(first.errors);
  const [meta, setMeta] = useState({ category: "other", issueId: presetIssueId, description: "" });
  const [busy, setBusy] = useState(false);

  const add = (files) => {
    const { valid, errors: errs } = validateDocs(files, items.length);
    setErrors(errs);
    setItems((list) => [...list, ...valid.map((file) => ({ key: Math.random().toString(36).slice(2), file, status: "ready" }))]);
  };

  const pending = items.filter((i) => i.status !== "done");

  const submit = async (e) => {
    e.preventDefault();
    if (!pending.length) {
      setErrors(["Добавьте хотя бы один файл."]);
      return;
    }
    setBusy(true);
    setErrors([]);
    let failed = 0;
    for (const item of pending) {
      setItems((list) => list.map((i) => (i.key === item.key ? { ...i, status: "uploading", error: null } : i)));
      try {
        await onUpload(item.file, meta);
        setItems((list) => list.map((i) => (i.key === item.key ? { ...i, status: "done" } : i)));
      } catch (err) {
        failed += 1;
        setItems((list) => list.map((i) => (i.key === item.key ? { ...i, status: "error", error: err.message } : i)));
      }
    }
    setBusy(false);
    if (!failed) onClose(pending.length);
  };

  const hasErrors = items.some((i) => i.status === "error");

  return (
    <Modal
      open
      onClose={() => !busy && onClose(items.filter((i) => i.status === "done").length)}
      as="form"
      onSubmit={submit}
      size="lg"
      title="Загрузка документов"
      dismissable={!busy}
      footer={
        <>
          <Button variant="subtle" onClick={() => onClose(items.filter((i) => i.status === "done").length)} disabled={busy}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" iconBefore="upload" loading={busy} disabled={!pending.length}>
            {busy ? "Загружаем…" : hasErrors ? "Повторить" : `Загрузить${pending.length ? ` (${pending.length})` : ""}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {errors.length > 0 && (
          <FormAlert>
            <ul className="flex flex-col gap-1">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </FormAlert>
        )}

        {items.length > 0 && (
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line" aria-label="Выбранные файлы">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3 px-3 py-2">
                <DocIcon doc={{ name: i.file.name }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink" title={i.file.name}>
                    {i.file.name}
                  </p>
                  <p className={cn("text-xs", i.status === "error" ? "text-danger-text" : "text-ink-subtlest")}>
                    {i.status === "error" ? i.error : formatBytes(i.file.size)}
                  </p>
                </div>
                {i.status === "uploading" && <Spinner label={`Загружается ${i.file.name}`} />}
                {i.status === "done" && (
                  <span className="inline-flex items-center gap-1 text-xs text-success-text">
                    <Icon name="checkCircle" />
                    Загружен
                  </span>
                )}
                {(i.status === "ready" || i.status === "error") && (
                  <IconButton icon="x" size="sm" label={`Убрать ${i.file.name}`} disabled={busy} onClick={() => setItems((list) => list.filter((x) => x.key !== i.key))} />
                )}
              </li>
            ))}
          </ul>
        )}

        <AttachmentDropzone
          onFiles={add}
          disabled={busy}
          compact={items.length > 0}
          accept={DOC_ACCEPT}
          what="файлы"
          icon="upload"
          pasteHint={false}
          remaining={MAX_FILES - items.length}
          hint={`PDF, Word, Excel, PowerPoint, Markdown, изображения, ZIP — до ${formatBytes(DOC_MAX_SIZE)} каждый.`}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Категория"
            value={meta.category}
            onChange={(e) => setMeta((m) => ({ ...m, category: e.target.value }))}
            disabled={busy}
            options={DOC_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
          />
          <SelectField
            label="Связанная задача"
            optional
            value={meta.issueId}
            onChange={(e) => setMeta((m) => ({ ...m, issueId: e.target.value }))}
            disabled={busy}
            placeholder="Без задачи"
            options={issueOptions(issues)}
          />
        </div>
        <TextareaField
          label="Описание"
          optional
          rows={2}
          maxLength={500}
          value={meta.description}
          onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
          disabled={busy}
          hint="Будет у всех загружаемых файлов"
        />
      </div>
    </Modal>
  );
}
