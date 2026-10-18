import { useEffect } from "react";

export function useClickOutside(refs, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onPointerDown = (e) => {
      const inside = refs.some((r) => r.current?.contains(e.target));
      if (!inside) handler(e);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [enabled, handler]);
}
