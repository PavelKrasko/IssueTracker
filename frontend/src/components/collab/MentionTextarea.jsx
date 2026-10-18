import { forwardRef, useCallback, useId, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Avatar, controlClasses } from "@/components/ui";
import { cn } from "@/utils/cn";
import { fromMarkup, toMarkup } from "@/utils/mentions";

export function useMentions(initialBody = "") {
  const initial = useMemo(() => fromMarkup(initialBody), [initialBody]);
  const [text, setText] = useState(initial.text);
  const [picked, setPicked] = useState(initial.picked);
  const addPicked = useCallback((p) => setPicked((list) => (list.some((x) => x.id === p.id) ? list : [...list, { id: p.id, name: p.name }])), []);
  const toBody = useCallback(() => toMarkup(text, picked), [text, picked]);
  const reset = useCallback((body = "") => {
    const x = fromMarkup(body);
    setText(x.text);
    setPicked(x.picked);
  }, []);
  return { text, setText, picked, addPicked, toBody, reset, dirty: text !== initial.text };
}

function findQuery(text, caret) {
  const before = text.slice(0, caret);
  const m = before.match(/(^|\s)@([^\s@]*(?:\s[^\s@]+){0,2})$/u);
  if (!m) return null;
  return { start: caret - m[2].length - 1, query: m[2] };
}

export const MentionTextarea = forwardRef(function MentionTextarea(
  { mentions, people, label, labelHidden, hint, error, rows = 3, className, onKeyDown, disabled, placeholder, id: idProp, ...props },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-mentions`;
  const taRef = useRef(null);
  useImperativeHandle(ref, () => taRef.current);
  const [query, setQuery] = useState(null);
  const [active, setActive] = useState(0);

  const options = useMemo(() => {
    if (!query) return [];
    const q = query.query.toLowerCase().trim();
    return people
      .filter((p) => !q || p.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || p.name.toLowerCase().startsWith(q) || p.email?.toLowerCase().startsWith(q))
      .slice(0, 6);
  }, [query, people]);
  const open = Boolean(query) && options.length > 0;

  const update = (el) => {
    const q = findQuery(el.value, el.selectionStart ?? el.value.length);
    setQuery(q);
    setActive(0);
  };

  const insert = (person) => {
    const el = taRef.current;
    const caret = el.selectionStart ?? mentions.text.length;
    const before = mentions.text.slice(0, query.start);
    const after = mentions.text.slice(caret);
    const insertText = `@${person.name} `;
    mentions.setText(before + insertText + after.replace(/^\s/, ""));
    mentions.addPicked(person);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + insertText.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const keyDown = (e) => {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % options.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i - 1 + options.length) % options.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insert(options[active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setQuery(null);
        return;
      }
    }
    onKeyDown?.(e);
  };

  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("relative flex min-w-0 flex-col gap-1", className)}>
      {label && (
        <label htmlFor={id} className={cn("text-xs font-semibold text-ink-subtle", labelHidden && "sr-only")}>
          {label}
        </label>
      )}
      <textarea
        ref={taRef}
        id={id}
        rows={rows}
        value={mentions.text}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          mentions.setText(e.target.value);
          update(e.target);
        }}
        onKeyDown={keyDown}
        onClick={(e) => update(e.target)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlClasses(error), "min-h-[72px] resize-y px-2 py-2")}
        {...props}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Упомянуть участника"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-md border border-line bg-surface-overlay py-1 shadow-overlay"
        >
          {options.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                insert(p);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm", i === active ? "bg-brand-subtle text-ink" : "text-ink")}
            >
              <Avatar person={p} size="sm" decorative />
              <span className="min-w-0 flex-1 truncate">{p.isMe ? `${p.name} (вы)` : p.name}</span>
              <span className="truncate text-xs text-ink-subtlest">{p.email}</span>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger-text">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-ink-subtlest">
            {hint}
          </p>
        )
      )}
    </div>
  );
});
