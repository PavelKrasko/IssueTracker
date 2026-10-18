import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/icons";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/utils/cn";

export function Menu({ renderTrigger, items, align = "right", header, className }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useClickOutside([triggerRef, menuRef], () => setOpen(false), open);

  const itemsEls = () => [...(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (open) requestAnimationFrame(() => itemsEls()[0]?.focus());
  }, [open]);

  const onMenuKeyDown = (e) => {
    const els = itemsEls();
    const i = els.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      els[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      els[els.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const triggerProps = {
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
    onClick: () => setOpen((o) => !o),
    onKeyDown: (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
    },
  };

  const itemClass = (tone) =>
    cn(
      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-none transition-colors duration-instant",
      tone === "danger" ? "text-danger-text hover:bg-danger-subtle focus:bg-danger-subtle" : "text-ink hover:bg-surface-hovered focus:bg-surface-hovered"
    );

  return (
    <div className={cn("relative", className)}>
      {renderTrigger({ ref: triggerRef, props: triggerProps, open })}
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute top-full z-30 mt-1 min-w-[200px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md bg-surface-overlay py-1 shadow-overlay",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {header && <div className="border-b border-line px-3 py-2">{header}</div>}
          {items.filter((i) => !i.hidden).map((item) => {
            const content = (
              <>
                {item.icon && <Icon name={item.icon} className="h-4 w-4 shrink-0" />}
                <span className="truncate">{item.label}</span>
              </>
            );
            return (
              <div key={item.label} role="none">
                {item.separatorBefore && <div role="separator" className="my-1 border-t border-line" />}
                {item.href ? (
                  <a
                    role="menuitem"
                    tabIndex={-1}
                    href={item.href}
                    download={item.download}
                    target={item.download ? undefined : "_blank"}
                    rel="noreferrer"
                    className={itemClass(item.tone)}
                    onClick={() => close(false)}
                  >
                    {content}
                  </a>
                ) : item.to ? (
                  <Link role="menuitem" tabIndex={-1} to={item.to} className={itemClass(item.tone)} onClick={() => close(false)}>
                    {content}
                  </Link>
                ) : (
                  <button
                    role="menuitem"
                    tabIndex={-1}
                    type="button"
                    className={itemClass(item.tone)}
                    onClick={() => {
                      close(!item.keepFocusAway);
                      item.onSelect?.();
                    }}
                  >
                    {content}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
