import { useRef, useState } from "react";
import { Button, FormAlert, Modal, TextareaField, TextField } from "@/components/ui";

export function TeamFormModal({ open, team, onClose, onSubmit }) {
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [error, setError] = useState();
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!name.trim()) {
      setError("Введите название команды.");
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name, description });
    } catch (err) {
      setSaving(false);
      if (err.fields?.name) {
        setError(err.fields.name);
        nameRef.current?.focus();
      } else setFormError(err.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      as="form"
      onSubmit={submit}
      size="sm"
      title={team ? "Изменить команду" : "Новая команда"}
      dismissable={!saving}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {team ? "Сохранить" : "Создать команду"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {formError && <FormAlert>{formError}</FormAlert>}
        <TextField
          ref={nameRef}
          label="Название"
          required
          maxLength={60}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(undefined);
          }}
          error={error}
          disabled={saving}
          placeholder="Например: Frontend"
          data-autofocus
        />
        <TextareaField
          label="Описание"
          optional
          rows={3}
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={saving}
          placeholder="Чем занимается команда"
        />
      </div>
    </Modal>
  );
}
