import { useState } from "react";
import { Button, FormAlert, Modal, SelectField } from "@/components/ui";
import { countLabel } from "@/utils/format";

export function CompleteSprintModal({ sprint, unfinished, plannedSprints, onClose, onConfirm }) {
  const [moveTo, setMoveTo] = useState(plannedSprints[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const done = sprint.issuesDone;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onConfirm(moveTo || null);
      onClose();
    } catch (err) {
      setSaving(false);
      setError(err.message);
    }
  };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      as="form"
      onSubmit={submit}
      title={`Завершить «${sprint.name}»`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" loading={saving} iconBefore="flag">
            Завершить спринт
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <FormAlert>{error}</FormAlert>}
        <p className="text-sm text-ink">
          Выполнено: <b>{countLabel(done, ["задача", "задачи", "задач"])}</b>, не завершено: <b>{unfinished}</b>.
        </p>
        {unfinished > 0 ? (
          <SelectField
            label="Незавершённые задачи перенести в"
            value={moveTo}
            onChange={(e) => setMoveTo(e.target.value)}
            options={[...plannedSprints.map((s) => ({ value: s.id, label: s.name })), { value: "", label: "Бэклог" }]}
            disabled={saving}
            hint={plannedSprints.length ? undefined : "Запланированных спринтов нет — задачи вернутся в бэклог."}
          />
        ) : (
          <p className="text-sm text-success-text">Все задачи выполнены — отличная работа! 🎉</p>
        )}
      </div>
    </Modal>
  );
}
