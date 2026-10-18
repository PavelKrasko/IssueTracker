import { useState } from "react";
import { Button } from "./Button";
import { FormAlert } from "./FormAlert";
import { Modal } from "./Modal";

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Удалить", tone = "danger" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (busy) return;
    setError("");
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      setBusy(false);
      onClose();
    } catch (e) {
      setBusy(false);
      setError(e.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={title}
      description={description}
      dismissable={!busy}
      footer={
        <>
          <Button variant="subtle" onClick={close} disabled={busy} data-autofocus>
            Отмена
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={confirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error ? <FormAlert>{error}</FormAlert> : <span className="sr-only">Действие нельзя отменить.</span>}
    </Modal>
  );
}
