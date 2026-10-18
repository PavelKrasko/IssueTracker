import { useEffect, useRef } from "react";
import { IMAGE_TYPES, nameForPasted } from "@/utils/files";

const stack = [];

function onPaste(e) {
  const top = stack[stack.length - 1];
  if (!top) return;
  const files = [...(e.clipboardData?.files ?? [])].filter((f) => IMAGE_TYPES.includes(f.type));
  if (!files.length) return;
  e.preventDefault();
  top.current(files.map(nameForPasted));
}

export function usePasteImages(onImages, enabled = true) {
  const handlerRef = useRef(onImages);
  handlerRef.current = onImages;

  useEffect(() => {
    if (!enabled) return;
    if (stack.length === 0) document.addEventListener("paste", onPaste);
    stack.push(handlerRef);
    return () => {
      stack.splice(stack.indexOf(handlerRef), 1);
      if (stack.length === 0) document.removeEventListener("paste", onPaste);
    };
  }, [enabled]);
}
