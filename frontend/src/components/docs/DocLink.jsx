import { isViewable } from "@/constants/docs";
import { cn, focusRing } from "@/utils/cn";
import { downloadUrl, useDocUrl } from "./useDocUrl";

export function DocLink({ doc, className, children }) {
  const { url } = useDocUrl(doc);
  const viewable = isViewable(doc);
  if (!url) return <span className={cn("text-ink", className)}>{children ?? doc.name}</span>;
  return (
    <a
      href={viewable ? url : downloadUrl(doc)}
      target={viewable ? "_blank" : undefined}
      rel="noreferrer"
      download={viewable ? undefined : doc.name}
      title={viewable ? `Открыть «${doc.name}» в новой вкладке` : `Скачать «${doc.name}»`}
      className={cn("rounded-sm text-ink hover:text-ink-brand hover:underline", focusRing, className)}
    >
      {children ?? doc.name}
    </a>
  );
}
