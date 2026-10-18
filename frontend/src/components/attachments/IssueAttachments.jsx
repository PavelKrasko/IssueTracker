import { useEffect, useRef, useState } from "react";
import { Button, ConfirmDialog, FormAlert } from "@/components/ui";
import { useIssues } from "@/context/IssuesContext";
import { useToast } from "@/context/ToastContext";
import { usePasteImages } from "@/hooks/usePasteImages";
import { IMAGE_ACCEPT, MAX_ATTACHMENTS, validateImages } from "@/utils/files";
import { AttachmentDropzone } from "./AttachmentDropzone";
import { AttachmentGrid } from "./AttachmentGrid";
import { ImageLightbox } from "./ImageLightbox";

export function IssueAttachments({ issue }) {
  const { addAttachments, removeAttachment } = useIssues();
  const toast = useToast();
  const [uploading, setUploading] = useState([]);
  const [errors, setErrors] = useState([]);
  const [viewIndex, setViewIndex] = useState(null);
  const [toRemove, setToRemove] = useState(null);
  const inputRef = useRef(null);

  const saved = issue.attachments ?? [];
  const items = [
    ...saved.map((a) => ({ key: a.id, name: a.name, size: a.size, att: a })),
    ...uploading,
  ];
  const remaining = MAX_ATTACHMENTS - items.length;

  useEffect(() => () => uploading.forEach((u) => URL.revokeObjectURL(u.localUrl)), []);

  const handleFiles = async (files) => {
    const { valid, errors: errs } = validateImages(files, items.length);
    setErrors(errs);
    if (!valid.length) return;

    const pending = valid.map((file) => ({
      key: `up-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      size: file.size,
      localUrl: URL.createObjectURL(file),
      status: "uploading",
    }));
    setUploading((u) => [...u, ...pending]);

    let ok = 0;
    for (const p of pending) {
      const failed = await addAttachments(issue.id, [p.file]);
      setUploading((u) => u.filter((x) => x.key !== p.key));
      URL.revokeObjectURL(p.localUrl);
      if (failed.length) setErrors((e) => [...e, `«${p.name}» не загрузилось: ${failed[0].message}`]);
      else ok += 1;
    }
    if (ok) toast(ok === 1 ? "Изображение прикреплено" : `Прикреплено изображений: ${ok}`);
  };

  usePasteImages(handleFiles);

  const viewable = items.filter((i) => i.status !== "uploading");

  return (
    <section aria-labelledby="issue-attachments" className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <h3 id="issue-attachments" className="text-sm font-semibold text-ink">
          Вложения{saved.length > 0 && <span className="ml-1 font-normal text-ink-subtle">({saved.length})</span>}
        </h3>
        {items.length > 0 && (
          <Button size="sm" variant="subtle" iconBefore="plus" disabled={remaining <= 0} onClick={() => inputRef.current?.click()}>
            Добавить
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            handleFiles([...e.target.files]);
            e.target.value = "";
          }}
        />
      </div>

      {errors.length > 0 && (
        <FormAlert className="mt-2">
          <ul className="flex flex-col gap-1">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setErrors([])} className="mt-1 text-xs font-semibold underline">
            Скрыть
          </button>
        </FormAlert>
      )}

      <div className="mt-2">
        {items.length === 0 ? (
          <AttachmentDropzone onFiles={handleFiles} compact remaining={remaining} />
        ) : (
          <AttachmentGrid
            items={items}
            onOpen={(i) => setViewIndex(viewable.indexOf(items[i]))}
            onRemove={(item) => item.att && setToRemove(item.att)}
          />
        )}
      </div>

      {viewIndex !== null && viewIndex >= 0 && (
        <ImageLightbox items={viewable} index={Math.min(viewIndex, viewable.length - 1)} onIndexChange={setViewIndex} onClose={() => setViewIndex(null)} />
      )}

      <ConfirmDialog
        open={Boolean(toRemove)}
        onClose={() => setToRemove(null)}
        onConfirm={async () => {
          await removeAttachment(issue.id, toRemove.id);
          toast(`«${toRemove.name}» удалено`);
        }}
        title="Удалить изображение?"
        description={toRemove ? `«${toRemove.name}» будет удалено из задачи ${issue.key}.` : ""}
        confirmLabel="Удалить изображение"
      />
    </section>
  );
}
