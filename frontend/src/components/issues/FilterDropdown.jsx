import { useId, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn, focusRing } from "@/utils/cn";

export function FilterDropdown({ label, options, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();
  useClickOutside([btnRef, panelRef], () => setOpen(false), open);

  const count = selected.length;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium transition-colors duration-fast",
          count ? "bg-brand-subtle text-ink-brand hover:bg-brand-subtle/80" : "bg-neutral text-ink hover:bg-neutral-hover",
          focusRing
        )}
      >
        {label}
        {count > 0 && (
          <span className="rounded-full bg-brand px-1.5 text-2xs font-bold text-ink-inverse">
            {count}
            <span className="sr-only"> выбрано</span>
          </span>
        )}
        <Icon name="chevronDown" className={cn("h-4 w-4 transition-transform duration-fast", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-label={`Фильтр: ${label}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              btnRef.current?.focus();
            }
          }}
          className="absolute left-0 top-full z-30 mt-1 w-60 max-w-[calc(100vw-2rem)] rounded-md bg-surface-overlay py-1 shadow-overlay"
        >
          {options.length === 0 && <p className="px-3 py-2 text-sm text-ink-subtlest">Нет вариантов</p>}
          <ul className="max-h-64 overflow-y-auto">
            {options.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <li key={o.value}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-hovered">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(o.value)}
                      className={cn("h-4 w-4 shrink-0 rounded-xs accent-brand", focusRing)}
                    />
                    {o.icon && (
                      <span aria-hidden="true" className="inline-flex">
                        {o.icon}
                      </span>
                    )}
                    <span className="truncate">{o.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {count > 0 && (
            <div className="border-t border-line px-1 pt-1">
              <button
                type="button"
                onClick={onClear}
                className={cn("w-full rounded-sm px-2 py-1.5 text-left text-sm text-ink-subtle hover:bg-surface-hovered", focusRing)}
              >
                Сбросить «{label}»
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
