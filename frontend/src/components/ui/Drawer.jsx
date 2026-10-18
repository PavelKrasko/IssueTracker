import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "@/hooks/useDialog";

export function Drawer({ open, onClose, title, header, children, footer, returnFocusTo }) {
  const ref = useRef(null);
  const titleId = useId();
  useDialog(ref, { open, onClose, returnFocusTo });
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-blanket" onClick={onClose} aria-hidden="true" />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 right-0 flex w-full flex-col bg-surface-overlay shadow-overlay sm:max-w-xl"
      >
        {header}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
}
