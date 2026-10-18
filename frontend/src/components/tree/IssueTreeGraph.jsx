import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "@/components/ui";
import { STATUS_BY_ID, TYPE_BY_ID } from "@/constants/issues";
import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";
import { descendants } from "@/utils/planning";

const NODE_W = 236;
const NODE_H = 72;
const GAP_X = 56;
const GAP_Y = 14;

const STATUS_COLOR = {
  todo: "rgb(var(--chart-1))",
  in_progress: "rgb(var(--chart-2))",
  review: "rgb(var(--chart-3))",
  done: "rgb(var(--chart-4))",
};
const TYPE_COLOR = { task: "rgb(var(--brand))", bug: "rgb(var(--danger))", story: "rgb(var(--success))" };

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function layout(roots, childrenOf, collapsed, hideDone) {
  const nodes = [];
  const edges = [];
  let nextY = 0;
  const kids = (i) => (childrenOf[i.id] ?? []).filter((c) => !hideDone || c.status !== "done");

  const place = (issue, depth) => {
    const children = kids(issue);
    const isCollapsed = collapsed.has(issue.id);
    const node = { issue, depth, x: depth * (NODE_W + GAP_X), y: 0, hasChildren: children.length > 0, collapsed: isCollapsed };
    nodes.push(node);
    if (!children.length || isCollapsed) {
      node.y = nextY;
      nextY += NODE_H + GAP_Y;
      return node;
    }
    const placed = children.map((c) => place(c, depth + 1));
    node.y = (placed[0].y + placed[placed.length - 1].y) / 2;
    for (const p of placed) edges.push({ from: node, to: p });
    return node;
  };

  for (const r of roots) {
    place(r, 0);
    nextY += GAP_Y * 2;
  }
  const width = Math.max(...nodes.map((n) => n.x + NODE_W), NODE_W);
  const height = Math.max(nextY, NODE_H);
  return { nodes, edges, width, height };
}

function Node({ node, childrenOf, person, onOpen, onToggle }) {
  const { issue } = node;
  const [focused, setFocused] = useState(false);
  const all = descendants(issue.id, childrenOf);
  const done = all.filter((i) => i.status === "done").length;
  const status = STATUS_BY_ID[issue.status];
  const type = TYPE_BY_ID[issue.type];
  const label = `${issue.key}: ${issue.title}. ${type?.label}, ${status?.label}${all.length ? `, подзадач выполнено ${done} из ${all.length}` : ""}${node.collapsed ? ", ветка свёрнута" : ""}`;

  return (
    <g transform={`translate(${node.x},${node.y})`}>
      <g
        role="button"
        tabIndex={0}
        aria-label={label}
        data-node={issue.id}
        className="cursor-pointer outline-none"
        onFocus={(e) => setFocused(e.target.matches(":focus-visible"))}
        onBlur={() => setFocused(false)}
        onClick={() => onOpen(issue.key)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onOpen(issue.key);
          } else if (e.key === " " && node.hasChildren) {
            e.preventDefault();
            onToggle(issue.id);
          }
        }}
      >
        <rect width={NODE_W} height={NODE_H} rx={8} className={cn("fill-surface-raised transition-colors hover:fill-surface-hovered", focused ? "stroke-line-focus" : "stroke-line-bold/40")} strokeWidth={focused ? 3 : 1.5} />
        <rect width={5} height={NODE_H} rx={2} fill={STATUS_COLOR[issue.status]} />

        <rect x={14} y={12} width={14} height={14} rx={3} fill={TYPE_COLOR[issue.type]} />
        <text x={36} y={23} className={cn("text-[12px] font-semibold", issue.status === "done" ? "fill-ink-subtlest" : "fill-ink-subtle")} textDecoration={issue.status === "done" ? "line-through" : undefined}>
          {issue.key}
        </text>
        <text x={NODE_W - 12} y={23} textAnchor="end" className="fill-ink-subtlest text-[10px] font-bold uppercase tracking-wide">
          {status?.label}
        </text>
        <text x={14} y={44} className="fill-ink text-[13px]">
          {truncate(issue.title, 30)}
        </text>
        {all.length > 0 ? (
          <g transform="translate(14,54)">
            <rect width={150} height={5} rx={2.5} className="fill-neutral" />
            <rect width={(150 * done) / all.length} height={5} rx={2.5} fill={STATUS_COLOR.done} />
            <text x={158} y={6} className="fill-ink-subtle text-[10px] tabular-nums">
              {done}/{all.length}
            </text>
          </g>
        ) : null}
        {person && (
          <g transform={`translate(${NODE_W - 26},${NODE_H - 26})`}>
            <circle cx={9} cy={9} r={10} className="fill-neutral" />
            <text x={9} y={12.5} textAnchor="middle" className="fill-ink-subtle text-[9px] font-bold">
              {initials(person.name)}
            </text>
            <title>{person.name}</title>
          </g>
        )}
        <title>{`${issue.key}: ${issue.title}`}</title>
      </g>
      {node.hasChildren && (
        <g
          transform={`translate(${NODE_W},${NODE_H / 2})`}
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(issue.id);
          }}
          role="button"
          tabIndex={-1}
          aria-label={node.collapsed ? "Развернуть ветку" : "Свернуть ветку"}
        >
          <circle r={9} className="fill-surface-raised stroke-line-bold" strokeWidth={1.5} />
          <text y={4} textAnchor="middle" className="fill-ink-subtle text-[13px] font-bold">
            {node.collapsed ? "+" : "−"}
          </text>
        </g>
      )}
    </g>
  );
}

export function IssueTreeGraph({ roots, childrenOf, personById, onOpen, hideDone, height = 560 }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const { nodes, edges, width: contentW, height: contentH } = useMemo(() => layout(roots, childrenOf, collapsed, hideDone), [roots, childrenOf, collapsed, hideDone]);
  const wrapRef = useRef(null);
  const [view, setView] = useState({ x: 24, y: 24, k: 1 });
  const drag = useRef(null);

  const toggle = useCallback((id) => {
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const w = el.clientWidth - 48;
    const h = el.clientHeight - 48;
    const k = Math.max(0.25, Math.min(1.2, w / contentW, h / contentH));
    setView({ k, x: (el.clientWidth - contentW * k) / 2, y: Math.max(24, (el.clientHeight - contentH * k) / 2) });
  }, [contentW, contentH]);

  const rootsKey = roots.map((r) => r.id).join(",");
  useEffect(() => {
    fit();
  }, [rootsKey, hideDone]);

  const zoomAt = (factor, cx, cy) =>
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.2, v.k * factor));
      const f = k / v.k;
      return { k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f };
    });

  const zoomCenter = (factor) => {
    const el = wrapRef.current;
    zoomAt(factor, el.clientWidth / 2, el.clientHeight / 2);
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest("[role=button]")) return;
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const d = drag.current;
    setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const onKeyDown = (e) => {
    if (e.target.closest?.("[data-node]") && (e.key === "Enter" || e.key === " ")) return;
    if (e.key === "+" || e.key === "=") zoomCenter(1.2);
    else if (e.key === "-") zoomCenter(1 / 1.2);
    else if (e.key === "0") fit();
    else return;
    e.preventDefault();
  };

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-md border border-line bg-surface-overlay p-1 shadow-raised">
        <IconButton size="sm" icon="zoomIn" label="Приблизить (+)" onClick={() => zoomCenter(1.2)} />
        <IconButton size="sm" icon="zoomOut" label="Отдалить (−)" onClick={() => zoomCenter(1 / 1.2)} />
        <IconButton size="sm" icon="maximize" label="Вписать в экран (0)" onClick={fit} />
      </div>
      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="cursor-grab touch-none select-none overflow-hidden rounded-lg border border-line bg-surface-sunken active:cursor-grabbing"
        style={{
          height,
          backgroundImage: "radial-gradient(rgb(var(--line-bold) / 0.25) 1px, transparent 1px)",
          backgroundSize: `${20 * view.k}px ${20 * view.k}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
      >
        <svg width="100%" height="100%" role="group" aria-label="Граф подзадач. Tab — по задачам, Enter — открыть, пробел — свернуть ветку.">
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {edges.map(({ from, to }) => {
              const x1 = from.x + NODE_W + (from.hasChildren ? 9 : 0);
              const y1 = from.y + NODE_H / 2;
              const x2 = to.x;
              const y2 = to.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={`${from.issue.id}-${to.issue.id}`}
                  d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke={to.issue.status === "done" ? STATUS_COLOR.done : "rgb(var(--line-bold))"}
                  strokeOpacity={to.issue.status === "done" ? 0.8 : 0.5}
                  strokeWidth={2}
                />
              );
            })}
            {nodes.map((n) => (
              <Node key={n.issue.id} node={n} childrenOf={childrenOf} person={personById[n.issue.assigneeId]} onOpen={onOpen} onToggle={toggle} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
