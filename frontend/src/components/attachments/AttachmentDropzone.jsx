import { useId, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { cn, focusRing } from "@/utils/cn";
import { formatBytes, IMAGE_ACCEPT, MAX_ATTACHMENTS, MAX_FILE_SIZE } from "@/utils/files";

export function AttachmentDropzone({ onFiles, disabled, compact = false, remaining = MAX_ATTACHMENTS, accept = IMAGE_ACCEPT, hint: hintProp, what = "изображения", pasteHint = true, icon = "imagePlus" }) {
  const inputRef = useRef(null);
  const hintId = useId();
  const [over, setOver] = useState(false);

  const pick = (fileList) => {
    const files = [...(fileList ?? [])];
    if (files.length) onFiles(files);
  };

  const hint = hintProp ?? `PNG, JPG, GIF или WebP, до ${formatBytes(MAX_FILE_SIZE)}. Можно ещё ${remaining}.`;

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setOver(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) pick(e.dataTransfer.files);
      }}
      className={cn(
        "flex rounded-md border-2 border-dashed transition-colors duration-fast",
        compact ? "items-center gap-3 px-3 py-2" : "flex-col items-center gap-2 px-4 py-5 text-center",
        over ? "border-brand bg-brand-subtle" : "border-line-bold/40 bg-surface-sunken",
        disabled && "opacity-60"
      )}
    >
      <Icon name={icon} className={cn("shrink-0 text-ink-subtle", compact ? "h-5 w-5" : "h-7 w-7")} />
      <div className={cn("min-w-0", compact && "flex-1")}>
        <p className="text-sm text-ink">
          {over ? (
            "Отпустите, чтобы прикрепить"
          ) : (
            <>
              Перетащите {what}{compact ? "" : " сюда"} или{" "}
              <button
                type="button"
                disabled={disabled || remaining <= 0}
                onClick={() => inputRef.current?.click()}
                aria-describedby={hintId}
                className={cn("rounded-sm font-semibold text-ink-brand hover:underline disabled:text-ink-disabled disabled:no-underline", focusRing)}
              >
                выберите файлы
              </button>
            </>
          )}
        </p>
        <p id={hintId} className="mt-0.5 text-xs text-ink-subtlest">
          {hint} {pasteHint && <span className="hidden sm:inline">Скриншот можно вставить через Ctrl+V.</span>}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
