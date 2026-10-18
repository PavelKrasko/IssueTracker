import { Avatar, Button, SearchInput } from "@/components/ui";
import { PRIORITIES, STATUSES, TYPES } from "@/constants/issues";
import { usePlanning } from "@/context/PlanningContext";
import { useTeams } from "@/context/TeamsContext";
import { cn, focusRing } from "@/utils/cn";
import { FilterDropdown } from "./FilterDropdown";
import { PriorityIcon, TypeIcon } from "./IssueMeta";

export function IssueFilters({ filters, setFilter, toggleInList, reset, activeCount, showStatus = false, resultCount, totalCount }) {
  const { people, teams } = useTeams();
  const { sprints, versions, activeSprint } = usePlanning();
  const visiblePeople = people.slice(0, 5);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={filters.q}
          onChange={(v) => setFilter("q", v)}
          label="Поиск задач"
          placeholder="Название или ключ"
          className="w-full sm:w-64"
        />

        {people.length > 1 && (
          <div role="group" aria-label="Фильтр по исполнителю" className="flex items-center -space-x-1">
            {visiblePeople.map((p) => {
              const pressed = filters.assignee.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={pressed}
                  aria-label={`Задачи: ${p.name}${p.isMe ? " (вы)" : ""}`}
                  title={p.name}
                  onClick={() => toggleInList("assignee", p.id)}
                  className={cn(
                    "relative rounded-full ring-2 transition-transform duration-fast hover:z-10 hover:-translate-y-0.5",
                    pressed ? "z-10 ring-brand" : "ring-surface",
                    focusRing
                  )}
                >
                  <Avatar person={p} size="md" decorative />
                </button>
              );
            })}
          </div>
        )}

        <Button
          variant={filters.mine ? "primary" : "subtle"}
          aria-pressed={filters.mine}
          onClick={() => setFilter("mine", !filters.mine)}
        >
          Только мои
        </Button>

        {showStatus && (
          <FilterDropdown
            label="Статус"
            options={STATUSES.map((s) => ({ value: s.id, label: s.label }))}
            selected={filters.status}
            onToggle={(v) => toggleInList("status", v)}
            onClear={() => setFilter("status", [])}
          />
        )}
        <FilterDropdown
          label="Тип"
          options={TYPES.map((t) => ({ value: t.id, label: t.label, icon: <TypeIcon type={t.id} /> }))}
          selected={filters.type}
          onToggle={(v) => toggleInList("type", v)}
          onClear={() => setFilter("type", [])}
        />
        <FilterDropdown
          label="Приоритет"
          options={PRIORITIES.map((p) => ({ value: p.id, label: p.label, icon: <PriorityIcon priority={p.id} /> }))}
          selected={filters.priority}
          onToggle={(v) => toggleInList("priority", v)}
          onClear={() => setFilter("priority", [])}
        />
        <FilterDropdown
          label="Исполнитель"
          options={[
            { value: "none", label: "Не назначено", icon: <Avatar person={null} size="xs" decorative /> },
            ...people.map((p) => ({ value: p.id, label: p.isMe ? `${p.name} (вы)` : p.name, icon: <Avatar person={p} size="xs" decorative /> })),
          ]}
          selected={filters.assignee}
          onToggle={(v) => toggleInList("assignee", v)}
          onClear={() => setFilter("assignee", [])}
        />
        {teams.length > 0 && (
          <FilterDropdown
            label="Команда"
            options={[{ value: "none", label: "Без команды" }, ...teams.map((t) => ({ value: t.id, label: t.name }))]}
            selected={filters.team}
            onToggle={(v) => toggleInList("team", v)}
            onClear={() => setFilter("team", [])}
          />
        )}
        {sprints.length > 0 && (
          <FilterDropdown
            label="Спринт"
            options={[
              ...(activeSprint ? [{ value: "active", label: `Активный: ${activeSprint.name}` }] : []),
              { value: "none", label: "Бэклог (без спринта)" },
              ...sprints.filter((s) => s.state !== "active").map((s) => ({ value: s.id, label: s.state === "closed" ? `${s.name} (завершён)` : s.name })),
            ]}
            selected={filters.sprint}
            onToggle={(v) => toggleInList("sprint", v)}
            onClear={() => setFilter("sprint", [])}
          />
        )}
        {versions.length > 0 && (
          <FilterDropdown
            label="Версия"
            options={[{ value: "none", label: "Без версии" }, ...versions.map((v) => ({ value: v.id, label: v.name }))]}
            selected={filters.version}
            onToggle={(v) => toggleInList("version", v)}
            onClear={() => setFilter("version", [])}
          />
        )}
        <Button variant={filters.overdue ? "primary" : "subtle"} aria-pressed={filters.overdue} onClick={() => setFilter("overdue", !filters.overdue)}>
          Просроченные
        </Button>

        {activeCount > 0 && (
          <Button variant="link" onClick={reset} className="px-1">
            Сбросить фильтры ({activeCount})
          </Button>
        )}
      </div>

      {activeCount > 0 && resultCount !== undefined && (
        <p className="text-xs text-ink-subtle" role="status">
          Найдено {resultCount} из {totalCount}
        </p>
      )}
    </div>
  );
}
