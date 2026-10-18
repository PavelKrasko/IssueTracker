import { useRef, useState } from "react";
import { Button, FormAlert, Modal, TextareaField, TextField } from "@/components/ui";
import { TRANSLIT } from "@/utils/translit";
import { focusFirstError } from "@/utils/validation";

export function suggestKey(name) {
  const latin = name
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? c)
    .join("")
    .replace(/[^a-z0-9\s-]/g, "");
  const words = latin.split(/[\s-]+/).filter(Boolean);
  let key = words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] ?? "").slice(0, 3);
  key = key.toUpperCase().replace(/^[0-9]+/, "").slice(0, 10);
  return key.length >= 2 ? key : key.padEnd(2, "X").slice(0, key ? 2 : 0);
}

const KEY_RE = /^[A-Z][A-Z0-9]{1,9}$/;

export function ProjectFields({ initial, onSubmit, submitLabel, onCancel, readOnly = false, keyEditable = true }) {
  const [form, setForm] = useState({ name: initial?.name ?? "", key: initial?.key ?? "", description: initial?.description ?? "" });
  const [keyTouched, setKeyTouched] = useState(Boolean(initial?.key));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const refs = { name: useRef(null), key: useRef(null) };

  const submit = async (e) => {
    e.preventDefault();
    const v = {
      name: form.name.trim() ? undefined : "Введите название проекта.",
      key: !keyEditable || KEY_RE.test(form.key) ? undefined : "От 2 до 10 латинских букв и цифр, начинается с буквы.",
    };
    setErrors(v);
    if (focusFirstError(v, refs)) return;
    setSaving(true);
    setFormError("");
    try {
      await onSubmit(keyEditable ? form : { name: form.name, description: form.description });
      setSaving(false);
    } catch (err) {
      setSaving(false);
      if (err.fields) setErrors(err.fields);
      else setFormError(err.message);
    }
  };

  const disabled = saving || readOnly;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {formError && <FormAlert>{formError}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <TextField
          ref={refs.name}
          label="Название"
          required
          maxLength={80}
          value={form.name}
          onChange={(e) => {
            const name = e.target.value;
            setForm((f) => ({ ...f, name, key: keyEditable && !keyTouched ? suggestKey(name) : f.key }));
            setErrors((x) => ({ ...x, name: undefined }));
          }}
          error={errors.name}
          disabled={disabled}
          placeholder="Например: Веб-платформа"
          data-autofocus
        />
        <TextField
          ref={refs.key}
          label="Ключ"
          required={keyEditable}
          maxLength={10}
          value={form.key}
          onChange={(e) => {
            setKeyTouched(true);
            setForm((f) => ({ ...f, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }));
            setErrors((x) => ({ ...x, key: undefined }));
          }}
          error={errors.key}
          hint={keyEditable ? `Задачи: ${form.key || "KEY"}-1, ${form.key || "KEY"}-2…` : "Ключ нельзя изменить"}
          disabled={disabled || !keyEditable}
          className="font-mono"
        />
      </div>
      <TextareaField
        label="Описание"
        optional
        rows={3}
        maxLength={500}
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        disabled={disabled}
      />
      {!readOnly && (
        <div className="flex flex-wrap justify-end gap-2">
          {onCancel && (
            <Button variant="subtle" onClick={onCancel} disabled={saving}>
              Отмена
            </Button>
          )}
          <Button type="submit" variant="primary" loading={saving}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}

export function CreateProjectModal({ open, onClose, onCreate }) {
  return (
    <Modal open={open} onClose={onClose} size="md" title="Новый проект" description="Проект объединяет задачи, команды и документы. Участников можно пригласить после создания.">
      <div className="pb-4">
        <ProjectFields submitLabel="Создать проект" onCancel={onClose} onSubmit={onCreate} />
      </div>
    </Modal>
  );
}
