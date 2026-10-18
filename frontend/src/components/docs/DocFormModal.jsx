import { useRef, useState } from "react";
import { Button, FormAlert, Modal, SelectField, TextareaField, TextField } from "@/components/ui";
import { DOC_CATEGORIES } from "@/constants/docs";
import { useIssues } from "@/context/IssuesContext";
import { focusFirstError } from "@/utils/validation";
import { issueOptions } from "./DocUploadModal";

const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export function DocFormModal({ mode, doc, issueId = "", onClose, onSubmit }) {
  const { issues } = useIssues();
  const isLink = mode === "link" || doc?.kind === "link";
  const [form, setForm] = useState({
    name: doc?.name ?? "",
    url: doc?.url ?? "",
    category: doc?.category ?? "other",
    issueId: doc?.issueId ?? issueId ?? "",
    description: doc?.description ?? "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const refs = { name: useRef(null), url: useRef(null) };

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = {
      name: form.name.trim() ? undefined : "Введите название.",
      url: !isLink ? undefined : !form.url.trim() ? "Вставьте ссылку." : URL_RE.test(form.url.trim()) ? undefined : "Ссылка должна начинаться с https:// или http://",
    };
    setErrors(v);
    if (focusFirstError(v, refs)) return;
    setSaving(true);
    setFormError("");
    try {
      const { url, ...rest } = form;
      await onSubmit(isLink ? form : rest);
    } catch (err) {
      setSaving(false);
      if (err.fields) setErrors(err.fields);
      setFormError(err.message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      as="form"
      onSubmit={submit}
      size="md"
      title={mode === "link" ? "Ссылка на документацию" : "Изменить документ"}
      description={mode === "link" ? "Confluence, Google Docs, Notion, Figma, Swagger — любая страница с документацией." : undefined}
      dismissable={!saving}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {mode === "link" ? "Добавить ссылку" : "Сохранить"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {formError && <FormAlert>{formError}</FormAlert>}
        {isLink && (
          <TextField
            ref={refs.url}
            label="Ссылка"
            required
            type="url"
            inputMode="url"
            placeholder="https://"
            value={form.url}
            onChange={set("url")}
            error={errors.url}
            disabled={saving}
            data-autofocus={mode === "link" || undefined}
          />
        )}
        <TextField
          ref={refs.name}
          label="Название"
          required
          maxLength={200}
          value={form.name}
          onChange={set("name")}
          error={errors.name}
          disabled={saving}
          placeholder={isLink ? "Например: Спецификация API v2" : undefined}
          data-autofocus={mode === "edit" || undefined}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Категория" value={form.category} onChange={set("category")} disabled={saving} options={DOC_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
          <SelectField label="Связанная задача" optional value={form.issueId ?? ""} onChange={set("issueId")} disabled={saving} placeholder="Без задачи" options={issueOptions(issues)} />
        </div>
        <TextareaField label="Описание" optional rows={3} maxLength={500} value={form.description} onChange={set("description")} disabled={saving} />
      </div>
    </Modal>
  );
}
