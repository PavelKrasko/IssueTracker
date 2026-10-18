import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "@/hooks/useDialog";
import { cn } from "@/utils/cn";
import { IconButton } from "./IconButton";

const SIZES = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" };

export function Modal({ open, onClose, title, description, children, footer, size = "md", as = "div", onSubmit, dismissable = true }) {
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  useDialog(ref, { open, onClose: () => dismissable && onClose() });
  if (!open) return null;

  const Panel = as;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:p-4 sm:pt-[8vh]">
      <div className="absolute inset-0 bg-blanket" onClick={() => dismissable && onClose()} aria-hidden="true" />
      <Panel
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onSubmit={onSubmit}
        noValidate={as === "form" ? true : undefined}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-xl bg-surface-overlay shadow-overlay sm:max-h-[84vh] sm:rounded-lg",
          SIZES[size]
        )}
      >
        <div className="flex shrink-0 items-start gap-3 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-ink-subtle">
                {description}
              </p>
            )}
          </div>
          {dismissable && <IconButton icon="x" label="Закрыть" onClick={onClose} className="-mr-2 -mt-1" />}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:border-0 sm:px-6 sm:pb-6 sm:pt-4">
            {footer}
          </div>
        )}
      </Panel>
    </div>,
    document.body
  );
}
