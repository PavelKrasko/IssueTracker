import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { docsApi } from "@/api/docsApi";
import { DocFormModal } from "@/components/docs/DocFormModal";
import { DocUploadModal } from "@/components/docs/DocUploadModal";
import { ConfirmDialog } from "@/components/ui";
import { countLabel } from "@/utils/format";
import { useProject } from "./ProjectContext";
import { useToast } from "./ToastContext";

const DocumentsContext = createContext(null);

export function DocumentsProvider({ children }) {
  const toast = useToast();
  const pid = useProject().current.id;
  const [docs, setDocs] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      setDocs(await docsApi.list(pid));
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, [pid]);

  useEffect(() => {
    reload();
  }, [reload]);

  const uploadDoc = useCallback(async (file, meta) => {
    const doc = await docsApi.upload(pid, file, meta);
    setDocs((list) => [doc, ...list]);
    return doc;
  }, [pid]);

  const addLink = useCallback(async (meta) => {
    const doc = await docsApi.addLink(pid, meta);
    setDocs((list) => [doc, ...list]);
    return doc;
  }, [pid]);

  const updateDoc = useCallback(async (id, meta) => {
    const doc = await docsApi.update(pid, id, meta);
    setDocs((list) => list.map((d) => (d.id === id ? doc : d)));
    return doc;
  }, [pid]);

  const deleteDoc = useCallback(async (id) => {
    await docsApi.remove(pid, id);
    setDocs((list) => list.filter((d) => d.id !== id));
  }, [pid]);

  const openUpload = useCallback(({ files = [], issueId = "" } = {}) => setDialog({ type: "upload", files, issueId }), []);
  const openLink = useCallback(({ issueId = "" } = {}) => setDialog({ type: "link", issueId }), []);
  const openEdit = useCallback((doc) => setDialog({ type: "edit", doc }), []);
  const requestDelete = useCallback((doc) => setToDelete(doc), []);

  const value = useMemo(
    () => ({ docs, status, error, reload, uploadDoc, addLink, updateDoc, deleteDoc, openUpload, openLink, openEdit, requestDelete }),
    [docs, status, error, reload, uploadDoc, addLink, updateDoc, deleteDoc, openUpload, openLink, openEdit, requestDelete]
  );

  return (
    <DocumentsContext.Provider value={value}>
      {children}

      {dialog?.type === "upload" && (
        <DocUploadModal
          initialFiles={dialog.files}
          issueId={dialog.issueId}
          onUpload={uploadDoc}
          onClose={(uploaded) => {
            setDialog(null);
            if (uploaded) toast(`Загружено: ${countLabel(uploaded, ["документ", "документа", "документов"])}`);
          }}
        />
      )}

      {(dialog?.type === "link" || dialog?.type === "edit") && (
        <DocFormModal
          mode={dialog.type}
          doc={dialog.doc}
          issueId={dialog.issueId}
          onClose={() => setDialog(null)}
          onSubmit={async (meta) => {
            if (dialog.type === "link") {
              const d = await addLink(meta);
              toast(`Ссылка «${d.name}» добавлена`);
            } else {
              const d = await updateDoc(dialog.doc.id, meta);
              toast(`«${d.name}» сохранён`);
            }
            setDialog(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          await deleteDoc(toDelete.id);
          toast(`«${toDelete.name}» удалён`);
        }}
        title={toDelete ? `Удалить «${toDelete.name}»?` : ""}
        description={toDelete?.kind === "link" ? "Ссылка исчезнет из документации проекта." : "Файл будет удалён без возможности восстановления."}
        confirmLabel="Удалить"
      />
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments должен использоваться внутри <DocumentsProvider>");
  return ctx;
}
