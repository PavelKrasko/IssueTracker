import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { cn, focusRing } from "@/utils/cn";

const ToastContext = createContext(null);

const TONES = {
  success: { icon: "checkCircle", iconClass: "text-success" },
  error: { icon: "alert", iconClass: "text-danger" },
  info: { icon: "info", iconClass: "text-ink-brand" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (message, { tone = "success", duration = 5000 } = {}) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((list) => [...list.slice(-2), { id, message, tone }]);
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end"
      >
        {toasts.map((t) => {
          const tone = TONES[t.tone] ?? TONES.info;
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md bg-surface-overlay px-4 py-3 text-sm text-ink shadow-overlay"
            >
              <Icon name={tone.icon} className={cn("mt-0.5 h-4 w-4 shrink-0", tone.iconClass)} />
              <p className="min-w-0 flex-1 break-words">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Закрыть уведомление"
                className={cn("-m-1 rounded-sm p-1 text-ink-subtle hover:bg-neutral", focusRing)}
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast должен использоваться внутри <ToastProvider>");
  return ctx.toast;
}
