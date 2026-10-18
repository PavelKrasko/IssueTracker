import { useEffect, useMemo, useRef, useState } from "react";
import { AttachmentDropzone } from "@/components/attachments/AttachmentDropzone";
import { AttachmentGrid } from "@/components/attachments/AttachmentGrid";
import { ImageLightbox } from "@/components/attachments/ImageLightbox";
import { usePasteImages } from "@/hooks/usePasteImages";
import { MAX_ATTACHMENTS, validateImages } from "@/utils/files";
import { Button, FormAlert, Modal, SelectField, TextField } from "@/components/ui";
import { EMPTY_ISSUE, PRIORITIES, STATUSES, TITLE_MAX, TYPES } from "@/constants/issues";
import { useIssues } from "@/context/IssuesContext";
import { usePlanning } from "@/context/PlanningContext";
import { useTeams } from "@/context/TeamsContext";
import { MentionTextarea, useMentions } from "@/components/collab/MentionTextarea";
import { formatMinutes, parseDuration } from "@/utils/time";
import { descendants, sprintOptions } from "@/utils/planning";
import { focusFirstError } from "@/utils/validation";

const toForm = (issue) => ({
  ...EMPTY_ISSUE,
  ...Object.fromEntries(Object.entries(issue ?? {}).filter(([k]) => k in EMPTY_ISSUE)),
  assigneeId: issue?.assigneeId ?? "",
  teamId: issue?.teamId ?? "",
  startDate: issue?.startDate ?? "",
  dueDate: issue?.dueDate ?? "",
  points: issue?.points ?? "",
  description: issue?.description ?? "",
  parentId: issue?.parentId ?? "",
  sprintId: issue?.sprintId ?? "",
  fixVersionId: issue?.fixVersionId ?? "",
  estimateMinutes: issue?.estimateMinutes ?? "",
});

function validate(form) {
  const e = {};
  if (!form.title.trim()) e.title = "Введите название задачи.";
  else if (form.title.length > TITLE_MAX) e.title = `Не больше ${TITLE_MAX} символов.`;
  if (form.points !== "" && form.points !== null) {
    const n = Number(form.points);
    if (!Number.isInteger(n) || n < 0 || n > 100) e.points = "Целое число от 0 до 100.";
  }
  if (form.startDate && form.dueDate && form.startDate > form.dueDate) e.dueDate = "Срок не может быть раньше даты начала.";
  if (form.estimateText?.trim() && parseDuration(form.estimateText) == null) e.estimateMinutes = "Например: 4ч, 1д, 90м.";
  return e;
}

export function IssueFormModal({ open, mode, issue, defaults, onClose, onSubmit }) {
  const { people, teams } = useTeams();
  const { issues, childrenOf } = useIssues();
  const { sprints, versions } = usePlanning();
  const initial = useMemo(() => toForm(mode === "edit" ? issue : { ...EMPTY_ISSUE, ...defaults }), [mode, issue, defaults]);
  const [form, setForm] = useState(() => ({ ...initial, estimateText: initial.estimateMinutes !== "" ? formatMinutes(initial.estimateMinutes) : "" }));
  const desc = useMentions(initial.description);

  const parentOptions = useMemo(() => {
    const banned = new Set(mode === "edit" ? [issue.id, ...descendants(issue.id, childrenOf).map((i) => i.id)] : []);
    return issues
      .filter((i) => !banned.has(i.id))
      .sort((a, b) => a.number - b.number)
      .map((i) => ({ value: i.id, label: `${i.key} · ${i.title.length > 60 ? `${i.title.slice(0, 59)}…` : i.title}` }));
  }, [issues, childrenOf, mode, issue]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const refs = { title: useRef(null), dueDate: useRef(null), points: useRef(null), estimateMinutes: useRef(null) };

  const [newFiles, setNewFiles] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [fileErrors, setFileErrors] = useState([]);
  const [viewIndex, setViewIndex] = useState(null);
  const existing = (mode === "edit" ? issue.attachments ?? [] : []).filter((a) => !removedIds.includes(a.id));
  const attachmentItems = [...existing.map((a) => ({ key: a.id, name: a.name, size: a.size, att: a })), ...newFiles];

  const newFilesRef = useRef(newFiles);
  newFilesRef.current = newFiles;
  useEffect(() => () => newFilesRef.current.forEach((f) => URL.revokeObjectURL(f.localUrl)), []);

  const addFiles = (files) => {
    const { valid, errors: errs } = validateImages(files, attachmentItems.length);
    setFileErrors(errs);
    setConfirmDiscard(false);
    if (!valid.length) return;
    setNewFiles((list) => [
      ...list,
      ...valid.map((file) => ({ key: `new-${Math.random().toString(36).slice(2)}`, file, name: file.name, size: file.size, localUrl: URL.createObjectURL(file) })),
    ]);
  };

  const removeItem = (item) => {
    if (item.att) setRemovedIds((ids) => [...ids, item.att.id]);
    else {
      URL.revokeObjectURL(item.localUrl);
      setNewFiles((list) => list.filter((f) => f.key !== item.key));
    }
  };

  usePasteImages(addFiles, !saving);

  const attachmentsChanged = newFiles.length > 0 || removedIds.length > 0;
  const { estimateText, ...formFields } = form;
  const estimateValue = estimateText.trim() ? parseDuration(estimateText) ?? initial.estimateMinutes : "";
  const current = { ...formFields, description: desc.toBody(), estimateMinutes: estimateValue };
  const dirty = JSON.stringify(current) !== JSON.stringify(initial) || attachmentsChanged;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
    setConfirmDiscard(false);
  };

  const requestClose = () => {
    if (saving) return;
    if (dirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const v = validate(form);
    setErrors(v);
    if (focusFirstError(v, refs)) return;

    const data = { ...current, title: form.title.trim() };
    const payload = isEdit ? Object.fromEntries(Object.entries(data).filter(([k, v]) => v !== initial[k])) : data;
    if (isEdit && Object.keys(payload).length === 0 && !attachmentsChanged) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onSubmit(payload, { newFiles: newFiles.map((f) => f.file), removedIds });
    } catch (err) {
      setSaving(false);
      if (err.fields) setErrors(err.fields);
      setFormError(err.message);
    }
  };

  const isEdit = mode === "edit";

  return (
    <Modal
      open={open}
      onClose={requestClose}
      as="form"
      onSubmit={submit}
      size="lg"
      title={isEdit ? `Редактирование ${issue.key}` : "Новая задача"}
      dismissable={!saving}
      footer={
        confirmDiscard ? (
          <div role="alert" className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-ink">Изменения не сохранены. Закрыть без сохранения?</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="subtle" onClick={() => setConfirmDiscard(false)} data-autofocus>
                Продолжить редактирование
              </Button>
              <Button variant="danger" onClick={onClose}>
                Закрыть без сохранения
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button variant="subtle" onClick={requestClose} disabled={saving}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {saving ? (newFiles.length ? "Загружаем изображения…" : "Сохранение…") : isEdit ? "Сохранить изменения" : "Создать задачу"}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <p className="text-xs text-ink-subtlest">Поля, отмеченные звёздочкой (*), обязательны.</p>
        {formError && <FormAlert>{formError}</FormAlert>}

        <TextField
          ref={refs.title}
          label="Название"
          required
          value={form.title}
          onChange={set("title")}
          maxLength={TITLE_MAX}
          error={errors.title}
          hint={`${form.title.length}/${TITLE_MAX}`}
          disabled={saving}
          placeholder="Например: Добавить экспорт задач в CSV"
          data-autofocus
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField label="Тип" value={form.type} onChange={set("type")} disabled={saving} options={TYPES.map((t) => ({ value: t.id, label: t.label }))} />
          <SelectField label="Статус" value={form.status} onChange={set("status")} disabled={saving} options={STATUSES.map((s) => ({ value: s.id, label: s.label }))} />
          <SelectField
            label="Приоритет"
            value={form.priority}
            onChange={set("priority")}
            disabled={saving}
            options={PRIORITIES.map((p) => ({ value: p.id, label: p.label }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Исполнитель"
            value={form.assigneeId}
            onChange={set("assigneeId")}
            disabled={saving}
            placeholder="Не назначено"
            options={people.map((p) => ({ value: p.id, label: p.isMe ? `${p.name} (вы)` : p.name }))}
            hint={people.length < 2 ? "Пригласите коллег в разделе «Проект», чтобы назначать им задачи." : undefined}
          />
          <SelectField
            label="Команда"
            value={form.teamId}
            onChange={set("teamId")}
            disabled={saving}
            placeholder="Без команды"
            options={teams.map((t) => ({ value: t.id, label: t.name }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField label="Начало" type="date" value={form.startDate} onChange={set("startDate")} disabled={saving} optional />
          <TextField
            ref={refs.dueDate}
            label="Срок"
            type="date"
            min={form.startDate || undefined}
            value={form.dueDate}
            onChange={set("dueDate")}
            error={errors.dueDate}
            disabled={saving}
            optional
          />
          <TextField
            ref={refs.points}
            label="Оценка (story points)"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={form.points}
            onChange={set("points")}
            error={errors.points}
            disabled={saving}
            optional
          />
        </div>

        <MentionTextarea
          mentions={desc}
          people={people}
          label="Описание (необязательно)"
          disabled={saving}
          rows={5}
          placeholder="Что нужно сделать и как понять, что задача готова. @ — упомянуть участника"
          hint="Упомянутые участники получат уведомление"
        />

        <SelectField
          label="Родительская задача"
          value={form.parentId}
          onChange={set("parentId")}
          disabled={saving}
          placeholder="Нет — самостоятельная задача"
          options={parentOptions}
          error={errors.parentId}
          hint="Подзадачи показываются в карточке родителя и на графе «Иерархия»"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField
            label="Спринт"
            value={form.sprintId}
            onChange={set("sprintId")}
            disabled={saving}
            placeholder="Бэклог"
            options={sprintOptions(sprints, initial.sprintId)}
            error={errors.sprintId}
          />
          <SelectField
            label="Версия"
            value={form.fixVersionId}
            onChange={set("fixVersionId")}
            disabled={saving}
            placeholder="Без версии"
            options={versions.map((v) => ({ value: v.id, label: v.released ? `${v.name} (выпущена)` : v.name }))}
          />
          <TextField
            ref={refs.estimateMinutes}
            label="Оценка времени"
            value={form.estimateText}
            onChange={(e) => {
              setForm((f) => ({ ...f, estimateText: e.target.value }));
              if (errors.estimateMinutes) setErrors((x) => ({ ...x, estimateMinutes: undefined }));
            }}
            error={errors.estimateMinutes}
            hint={!errors.estimateMinutes && parseDuration(form.estimateText) ? `= ${formatMinutes(parseDuration(form.estimateText))}` : "4ч, 1д 2ч, 90м"}
            disabled={saving}
            placeholder="4ч"
            optional
          />
        </div>

        <fieldset className="flex flex-col gap-2" disabled={saving}>
          <legend className="mb-1 text-xs font-semibold text-ink-subtle">
            Изображения <span className="font-normal text-ink-subtlest">(необязательно)</span>
          </legend>
          {fileErrors.length > 0 && (
            <FormAlert>
              <ul className="flex flex-col gap-1">
                {fileErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </FormAlert>
          )}
          <AttachmentGrid items={attachmentItems} onOpen={setViewIndex} onRemove={removeItem} removeDisabled={saving} />
          {attachmentItems.length < MAX_ATTACHMENTS && (
            <AttachmentDropzone onFiles={addFiles} disabled={saving} compact={attachmentItems.length > 0} remaining={MAX_ATTACHMENTS - attachmentItems.length} />
          )}
        </fieldset>
      </div>

      {viewIndex !== null && (
        <ImageLightbox items={attachmentItems} index={Math.min(viewIndex, attachmentItems.length - 1)} onIndexChange={setViewIndex} onClose={() => setViewIndex(null)} />
      )}
    </Modal>
  );
}
