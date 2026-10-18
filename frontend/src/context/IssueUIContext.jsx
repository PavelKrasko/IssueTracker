import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IssueDetailsDrawer } from "@/components/issues/IssueDetailsDrawer";
import { IssueFormModal } from "@/components/issues/IssueFormModal";
import { ConfirmDialog } from "@/components/ui";
import { useIssues } from "./IssuesContext";
import { useToast } from "./ToastContext";

const IssueUIContext = createContext(null);

export function IssueUIProvider({ children }) {
  const { byKey, status, createIssue, updateIssue, deleteIssue, addAttachments, removeAttachment } = useIssues();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const openKey = params.get("issue");

  const openIssue = useCallback(
    (key) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("issue", key);
        return next;
      }),
    [setParams]
  );

  const closeIssue = useCallback(
    () =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("issue");
        return next;
      }),
    [setParams]
  );

  const openCreate = useCallback((defaults = {}) => setForm({ mode: "create", defaults }), []);
  const openEdit = useCallback((issue) => setForm({ mode: "edit", issue }), []);
  const requestDelete = useCallback((issue) => setToDelete(issue), []);

  const submitForm = async (data, { newFiles = [], removedIds = [] } = {}) => {
    let issue;
    if (form.mode === "create") {
      issue = await createIssue(data);
    } else {
      issue = Object.keys(data).length ? await updateIssue(form.issue.id, data) : form.issue;
      for (const id of removedIds) await removeAttachment(issue.id, id);
    }
    const failed = newFiles.length ? await addAttachments(issue.id, newFiles) : [];
    setForm(null);
    toast(form.mode === "create" ? `Задача ${issue.key} создана` : `Изменения в ${issue.key} сохранены`);
    if (failed.length) {
      toast(`Не загрузились: ${failed.map((f) => f.name).join(", ")}. Добавьте их ещё раз в карточке задачи.`, { tone: "error", duration: 8000 });
    }
  };

  const confirmDelete = async () => {
    await deleteIssue(toDelete.id);
    if (openKey === toDelete.key) closeIssue();
    toast(`Задача ${toDelete.key} удалена`);
  };

  const value = useMemo(
    () => ({ openCreate, openEdit, openIssue, closeIssue, requestDelete }),
    [openCreate, openEdit, openIssue, closeIssue, requestDelete]
  );

  return (
    <IssueUIContext.Provider value={value}>
      {children}

      {openKey && (
        <IssueDetailsDrawer
          key={openKey}
          issueKey={openKey}
          issue={byKey[openKey]}
          loading={status === "loading"}
          onClose={closeIssue}
          onEdit={openEdit}
          onDelete={requestDelete}
          onUpdate={updateIssue}
        />
      )}

      {form && (
        <IssueFormModal
          key={form.mode === "edit" ? `edit-${form.issue.id}` : "create"}
          open
          mode={form.mode}
          issue={form.issue}
          defaults={form.defaults}
          onClose={() => setForm(null)}
          onSubmit={submitForm}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title={toDelete ? `Удалить ${toDelete.key}?` : ""}
        description={toDelete ? `«${toDelete.title}» будет удалена без возможности восстановления.` : ""}
        confirmLabel="Удалить задачу"
      />
    </IssueUIContext.Provider>
  );
}

export function useIssueUI() {
  const ctx = useContext(IssueUIContext);
  if (!ctx) throw new Error("useIssueUI должен использоваться внутри <IssueUIProvider>");
  return ctx;
}
