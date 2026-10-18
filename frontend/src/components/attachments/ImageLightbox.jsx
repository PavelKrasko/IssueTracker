import { useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";
import { useAttachmentUrl } from "@/hooks/useAttachmentUrl";
import { useDialog } from "@/hooks/useDialog";
import { cn, focusRing } from "@/utils/cn";
import { formatBytes } from "@/utils/files";

export function ImageLightbox({ items, index, onIndexChange, onClose }) {
  const ref = useRef(null);
  const swipe = useRef(null);
  useDialog(ref, { onClose });

  const item = items[index];
  const { url } = useAttachmentUrl(item?.att ?? { localUrl: item?.localUrl });
  const hasMany = items.length > 1;
  const go = (d) => onIndexChange((index + d + items.length) % items.length);

  if (!item) return null;

  const navBtn = cn(
    "grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white transition-colors duration-fast hover:bg-black/70",
    focusRing
  );

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Просмотр: ${item.name}`}
      onKeyDown={(e) => {
        if (!hasMany) return;
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      className="fixed inset-0 z-[60] flex flex-col bg-black/90 text-white"
    >
      <div className="flex shrink-0 items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="text-xs text-white/70">
            {formatBytes(item.size)}
            {hasMany && ` · ${index + 1} из ${items.length}`}
          </p>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className={cn("inline-flex h-9 items-center gap-1.5 rounded-sm px-3 text-sm hover:bg-white/10", focusRing)}>
            <Icon name="externalLink" />
            <span className="hidden sm:inline">Открыть оригинал</span>
            <span className="sr-only sm:hidden">Открыть оригинал</span>
          </a>
        )}
        <button type="button" onClick={onClose} aria-label="Закрыть просмотр" data-autofocus className={cn("grid h-9 w-9 place-items-center rounded-sm hover:bg-white/10", focusRing)}>
          <Icon name="x" className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-16"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onPointerDown={(e) => (swipe.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipe.current == null || !hasMany) return;
          const dx = e.clientX - swipe.current;
          swipe.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        {url ? (
          <img src={url} alt={item.name} draggable={false} className="max-h-full max-w-full select-none rounded-sm object-contain" />
        ) : (
          <p className="text-sm text-white/70">Загрузка изображения…</p>
        )}

        {hasMany && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Предыдущее изображение" className={cn(navBtn, "absolute left-2 top-1/2 -translate-y-1/2 sm:left-4")}>
              <Icon name="chevronLeft" className="h-6 w-6" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Следующее изображение" className={cn(navBtn, "absolute right-2 top-1/2 -translate-y-1/2 sm:right-4")}>
              <Icon name="chevronRight" className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
