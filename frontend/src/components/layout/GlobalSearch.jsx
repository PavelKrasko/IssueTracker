import { forwardRef, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/icons";
import { TypeIcon } from "@/components/issues/IssueMeta";
import { StatusLozenge } from "@/components/ui";
import { controlClasses } from "@/components/ui/Field";
import { useIssueUI } from "@/context/IssueUIContext";
import { useIssues } from "@/context/IssuesContext";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/utils/cn";

export const GlobalSearch = forwardRef(function GlobalSearch({ className, onDone, autoFocus }, inputRef) {
  const { issues } = useIssues();
  const { openIssue } = useIssueUI();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const listId = useId();
  const inputId = useId();
  useClickOutside([wrapRef], () => setOpen(false), open);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return issues.filter((i) => i.title.toLowerCase().includes(s) || i.key.toLowerCase().includes(s)).slice(0, 7);
  }, [issues, q]);

  const optionCount = q.trim() ? results.length + 1 : 0;

  const finish = () => {
    setOpen(false);
    setQ("");
    setActive(-1);
    onDone?.();
  };

  const choose = (index) => {
    if (index < results.length && index >= 0) {
      openIssue(results[index].key);
    } else {
      navigate(`/app/issues?q=${encodeURIComponent(q.trim())}`);
    }
    finish();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (optionCount ? (a + 1) % optionCount : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (optionCount ? (a - 1 + optionCount) % optionCount : -1));
    } else if (e.key === "Enter") {
      if (!q.trim()) return;
      e.preventDefault();
      choose(active >= 0 ? active : results.length);
    } else if (e.key === "Escape") {
      if (q) setQ("");
      else onDone?.();
      setOpen(false);
    }
  };

  const optionId = (i) => `${listId}-opt-${i}`;
  const showList = open && q.trim();

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <label htmlFor={inputId} className="sr-only">
        Поиск задач
      </label>
      <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtlest" />
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={Boolean(showList)}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        value={q}
        placeholder="Поиск задач"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(controlClasses(false), "h-8 bg-surface-sunken pl-8 pr-12")}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-xs border border-line px-1 text-2xs text-ink-subtlest lg:block" aria-hidden="true">
        /
      </span>

      {showList && (
        <ul id={listId} role="listbox" aria-label="Результаты поиска" className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md bg-surface-overlay py-1 shadow-overlay">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-ink-subtlest">Ничего не найдено по запросу «{q.trim()}»</li>}
          {results.map((i, idx) => (
            <li
              key={i.id}
              id={optionId(idx)}
              role="option"
              aria-selected={active === idx}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(idx)}
              onMouseEnter={() => setActive(idx)}
              className={cn("flex cursor-pointer items-center gap-2 px-3 py-2 text-sm", active === idx && "bg-surface-hovered")}
            >
              <TypeIcon type={i.type} />
              <span className="shrink-0 text-xs font-semibold text-ink-subtle">{i.key}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{i.title}</span>
              <StatusLozenge status={i.status} className="hidden sm:inline-flex" />
            </li>
          ))}
          <li
            id={optionId(results.length)}
            role="option"
            aria-selected={active === results.length}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => choose(results.length)}
            onMouseEnter={() => setActive(results.length)}
            className={cn("flex cursor-pointer items-center gap-2 border-t border-line px-3 py-2 text-sm text-ink-brand", active === results.length && "bg-surface-hovered")}
          >
            <Icon name="list" />
            Все результаты в списке задач
          </li>
        </ul>
      )}
    </div>
  );
});
