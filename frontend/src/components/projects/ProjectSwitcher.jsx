import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/icons";
import { Menu } from "@/components/ui";
import { ROLE_LABELS, useProject } from "@/context/ProjectContext";
import { useToast } from "@/context/ToastContext";
import { cn, focusRing } from "@/utils/cn";
import { CreateProjectModal } from "./ProjectForm";

export function ProjectBadge({ project, size = "md" }) {
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center rounded-md bg-discovery font-bold text-ink-inverse", size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs")}>
      {project.key.slice(0, 2)}
    </span>
  );
}

export function ProjectSwitcher({ compact, onNavigate }) {
  const { projects, current, select } = useProject();
  const navigate = useNavigate();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const { createProject } = useProject();

  const go = (path) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <>
      <Menu
        align="left"
        className={compact ? "" : "min-w-0 flex-1"}
        items={[
          ...projects.map((p) => ({
            label: `${p.name} (${p.key})`,
            icon: p.id === current.id ? "check" : "folder",
            onSelect: () => {
              if (p.id !== current.id) {
                select(p.id);
                go("/app/board");
              }
            },
          })),
          { label: "Создать проект", icon: "plus", onSelect: () => setCreating(true), separatorBefore: true },
          { label: "Настройки проекта", icon: "settings", onSelect: () => go("/app/project") },
        ]}
        renderTrigger={({ ref, props }) => (
          <button
            ref={ref}
            type="button"
            aria-label={`Проект: ${current.name}. Сменить проект`}
            title={compact ? `${current.name} — сменить проект` : undefined}
            className={cn("flex w-full min-w-0 items-center gap-3 rounded-md p-1 text-left transition-colors duration-fast hover:bg-neutral", focusRing)}
            {...props}
          >
            <ProjectBadge project={current} />
            {!compact && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{current.name}</span>
                  <span className="block truncate text-xs text-ink-subtle">
                    {current.key} · {ROLE_LABELS[current.role]}
                  </span>
                </span>
                <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-ink-subtle" />
              </>
            )}
          </button>
        )}
      />
      <CreateProjectModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (data) => {
          const p = await createProject(data);
          setCreating(false);
          toast(`Проект «${p.name}» создан`);
          go("/app/board");
        }}
      />
    </>
  );
}
