import { IconButton, Menu } from "@/components/ui";
import { isViewable } from "@/constants/docs";
import { useDocuments } from "@/context/DocumentsContext";
import { downloadUrl, useDocUrl } from "./useDocUrl";

export function DocActions({ doc }) {
  const { openEdit, requestDelete } = useDocuments();
  const { url } = useDocUrl(doc);
  return (
    <Menu
      items={[
        { label: doc.kind === "link" ? "Открыть ссылку" : "Открыть", icon: "externalLink", href: url ?? undefined, hidden: !url || !isViewable(doc) },
        { label: "Скачать", icon: "download", href: url ? downloadUrl(doc) : undefined, download: doc.name, hidden: !url || doc.kind === "link" },
        { label: "Изменить", icon: "edit", onSelect: () => openEdit(doc) },
        { label: "Удалить", icon: "trash", tone: "danger", onSelect: () => requestDelete(doc), separatorBefore: true },
      ]}
      renderTrigger={({ ref, props }) => <IconButton ref={ref} icon="more" label={`Действия: ${doc.name}`} {...props} />}
    />
  );
}
