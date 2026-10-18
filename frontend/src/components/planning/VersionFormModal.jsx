import { useState } from "react";
import { Button, Checkbox, FormAlert, Modal, TextareaField, TextField } from "@/components/ui";

export function VersionFormModal({ version, onClose, onSubmit }) {
  const edit = Boolean(version);
  const [form, setForm] = useState({ name: version?.name ?? "", description: version?.description ?? "", releaseDate: version?.releaseDate ?? "", released: version?.released ?? false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: "Введите название, например 1.2.0." });
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await onSubmit({ ...form, name: form.name.trim(), description: form.description.trim() });
      onClose();
    } catch (err) {
      setSaving(false);
      if (err.fields) setErrors(err.fields);
      setFormError(err.message);
    }
  };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      as="form"
      onSubmit={submit}
      title={edit ? `Версия ${version.name}` : "Новая версия"}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {edit ? "Сохранить" : "Создать версию"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <FormAlert>{formError}</FormAlert>}
        <TextField label="Название" required value={form.name} onChange={set("name")} error={errors.name} maxLength={60} disabled={saving} placeholder="1.2.0" hint="Обычно номер версии: 1.0.0, 2.1, «Весенний релиз»" data-autofocus />
        <TextField label="Плановая дата выпуска" type="date" optional value={form.releaseDate} onChange={set("releaseDate")} error={errors.releaseDate} disabled={saving} />
        <TextareaField label="Описание" optional rows={3} value={form.description} onChange={set("description")} error={errors.description} maxLength={2000} disabled={saving} placeholder="Что войдёт в версию" />
        {edit && <Checkbox label="Версия выпущена" checked={form.released} onChange={set("released")} disabled={saving} />}
      </div>
    </Modal>
  );
}
