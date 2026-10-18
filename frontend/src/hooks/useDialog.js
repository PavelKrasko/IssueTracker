import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;

export function useDialog(ref, { onClose, open = true, returnFocusTo } = {}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;
    const previouslyFocused = document.activeElement;

    const focusables = () => [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
    const first = node.querySelector("[data-autofocus]") ?? focusables()[0] ?? node;
    requestAnimationFrame(() => first.focus?.());

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) {
        e.preventDefault();
        return;
      }
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    openCount += 1;
    document.body.style.overflow = "hidden";

    return () => {
      node.removeEventListener("keydown", onKeyDown);
      openCount -= 1;
      if (openCount === 0) document.body.style.overflow = "";
      const target = (typeof returnFocusTo === "function" ? returnFocusTo() : null) ?? previouslyFocused;
      if (target?.isConnected) target.focus?.();
    };
  }, [open]);
}
