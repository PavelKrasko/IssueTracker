import { Icon } from "@/components/icons";
import { IconButton, Spinner } from "@/components/ui";
import { useAttachmentUrl } from "@/hooks/useAttachmentUrl";
import { cn, focusRing } from "@/utils/cn";
import { formatBytes } from "@/utils/files";

export function AttachmentGrid({ items, onOpen, onRemove, removeDisabled }) {
  if (!items.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:grid-cols-4">
      {items.map((item, index) => (
        <Thumb key={item.key} item={item} onOpen={() => onOpen(index)} onRemove={onRemove && (() => onRemove(item))} removeDisabled={removeDisabled} />
      ))}
    </ul>
  );
}

function Thumb({ item, onOpen, onRemove, removeDisabled }) {
  const { url, status } = useAttachmentUrl(item.att ?? { localUrl: item.localUrl });
  const uploading = item.status === "uploading";

  return (
    <li className="group relative min-w-0">
      <button
        type="button"
        onClick={onOpen}
        disabled={uploading || !url}
        aria-label={`Открыть изображение ${item.name}`}
        className={cn(
          "relative block aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-surface-sunken",
          "transition-shadow duration-fast hover:shadow-overlay disabled:cursor-default",
          focusRing
        )}
      >
        {url ? (
          <img src={url} alt="" draggable={false} className={cn("h-full w-full object-cover", uploading && "opacity-50")} />
        ) : (
          <span className="grid h-full w-full place-items-center text-ink-subtlest">
            {status === "error" ? <Icon name="image" className="h-6 w-6" /> : <Spinner className="h-5 w-5" />}
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 grid place-items-center bg-surface/40">
            <Spinner className="h-6 w-6 text-ink" label={`Загружается ${item.name}`} />
          </span>
        )}
      </button>

      {onRemove && !uploading && (
        <IconButton
          icon="x"
          size="sm"
          variant="default"
          label={`Удалить ${item.name}`}
          disabled={removeDisabled}
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 bg-surface-overlay/90 shadow-raised sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
        />
      )}

      <p className="mt-1 truncate text-xs text-ink" title={item.name}>
        {item.name}
      </p>
      <p className={cn("text-2xs", item.error ? "text-danger-text" : "text-ink-subtlest")}>
        {item.error ?? (uploading ? "Загружается…" : formatBytes(item.size))}
      </p>
    </li>
  );
}
