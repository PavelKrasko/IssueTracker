import { useState } from "react";
import { Button, FormAlert, Modal, TextareaField, TextField } from "@/components/ui";
import { toISODate } from "@/utils/format";

const plusDays = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + n));
};

export function SprintFormModal({ mode, sprint, defaultName, onClose, onSubmit }) {
  const start = mode === "start";
  const [form, setForm] = useState(() => {
    const s = sprint?.startDate ?? (start ? toISODate() : "");
    return { name: sprint?.name ?? defaultName ?? "", goal: sprint?.goal ?? "", startDate: s, endDate: sprint?.endDate ?? (start ? plusDays(s, 14) : "") };
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Введите название.";
    if (start && !form.startDate) errs.startDate = "Укажите дату начала.";
    if (start && !form.endDate) errs.endDate = "Укажите дату окончания.";
    if (form.startDate && form.endDate && form.startDate > form.endDate) errs.endDate = "Окончание раньше начала.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setFormError("");
    try {
      await onSubmit({ ...form, name: form.name.trim(), goal: form.goal.trim() });
      onClose();
    } catch (err) {
      setSaving(false);
      if (err.fields) setErrors(err.fields);
      setFormError(err.message);
    }
  };

  const title = start ? `Начать «${sprint.name}»` : mode === "edit" ? "Изменить спринт" : "Новый спринт";
  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      as="form"
      onSubmit={submit}
      title={title}
      description={start ? "Задачи спринта появятся на доске с фильтром «Активный спринт», а на странице спринтов — график сгорания." : undefined}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" loading={saving} iconBefore={start ? "play" : undefined}>
            {start ? "Начать спринт" : mode === "edit" ? "Сохранить" : "Создать спринт"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <FormAlert>{formError}</FormAlert>}
        <TextField label="Название" required value={form.name} onChange={set("name")} error={errors.name} maxLength={80} disabled={saving} data-autofocus placeholder="Спринт 1" />
        <TextareaField label="Цель спринта" optional rows={2} value={form.goal} onChange={set("goal")} error={errors.goal} maxLength={1000} disabled={saving} placeholder="Чего хотим добиться к концу спринта" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Начало" type="date" required={start} optional={!start} value={form.startDate} onChange={set("startDate")} error={errors.startDate} disabled={saving} />
          <TextField label="Окончание" type="date" required={start} optional={!start} min={form.startDate || undefined} value={form.endDate} onChange={set("endDate")} error={errors.endDate} disabled={saving} />
        </div>
        {form.startDate && !form.endDate && (
          <div className="flex flex-wrap gap-2">
            {[7, 14, 21].map((n) => (
              <Button key={n} size="sm" variant="subtle" onClick={() => setForm((f) => ({ ...f, endDate: plusDays(f.startDate, n) }))}>
                {n / 7} {n === 7 ? "неделя" : "недели"}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
