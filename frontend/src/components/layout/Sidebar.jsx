import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Icon } from "@/components/icons";
import { ProjectSwitcher } from "@/components/projects/ProjectSwitcher";
import { SidebarCustomizer } from "@/components/settings/SidebarCustomizer";
import { Button, IconButton, Modal } from "@/components/ui";
import { usePreferences } from "@/context/PreferencesContext";
import { useProject } from "@/context/ProjectContext";
import { cn, focusRing } from "@/utils/cn";

export function Sidebar({ isDesktop, mobileOpen, onCloseMobile }) {
  const { collapsed, toggleCollapsed, visibleItems } = usePreferences();
  const [customizing, setCustomizing] = useState(false);
  const { role } = useProject();
  const compact = isDesktop && collapsed;
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isDesktop && mobileOpen) closeRef.current?.focus();
  }, [isDesktop, mobileOpen]);

  return (
    <>
      {!isDesktop && mobileOpen && <div className="fixed inset-0 z-30 bg-blanket" onClick={onCloseMobile} aria-hidden="true" />}

      <nav
        id="app-sidebar"
        aria-label="Разделы"
        onKeyDown={(e) => !isDesktop && e.key === "Escape" && onCloseMobile()}
        className={cn(
          "flex shrink-0 flex-col border-r border-line bg-surface-sunken",
          isDesktop
            ? cn("sticky top-14 h-[calc(100dvh-3.5rem)] transition-[width] duration-slow", compact ? "w-sidebar-collapsed" : "w-sidebar")
            : cn(
                "fixed inset-y-0 left-0 z-40 w-[min(280px,85vw)] pt-[env(safe-area-inset-top)] shadow-overlay transition-transform duration-slow",
                mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
              )
        )}
      >

        <div className={cn("flex items-center gap-2 p-3", compact && "justify-center px-2")}>
          <ProjectSwitcher compact={compact} onNavigate={() => !isDesktop && onCloseMobile()} />
          {!isDesktop && <IconButton ref={closeRef} icon="x" label="Закрыть меню" onClick={onCloseMobile} />}
        </div>
        {!compact && role === "viewer" && (
          <p className="mx-3 mb-2 rounded-sm bg-warning-subtle px-2 py-1 text-xs text-warning-text">Только просмотр</p>
        )}

        <ul className={cn("flex flex-1 flex-col gap-0.5 overflow-y-auto pb-2 scrollbar-thin", compact ? "px-2" : "px-3")}>
          {!compact && <li className="px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wider text-ink-subtlest">Проект</li>}
          {visibleItems.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.to}
                onClick={() => !isDesktop && onCloseMobile()}
                title={compact ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "relative flex h-9 items-center gap-3 rounded-sm text-sm transition-colors duration-fast",
                    compact ? "justify-center px-0" : "px-2",
                    isActive
                      ? "bg-brand-subtle font-semibold text-ink-brand before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-xs before:bg-brand"
                      : "text-ink-subtle hover:bg-neutral hover:text-ink active:bg-neutral-hover",
                    focusRing
                  )
                }
              >
                <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                <span className={compact ? "sr-only" : "truncate"}>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className={cn("flex flex-col gap-0.5 border-t border-line py-2", compact ? "items-center px-2" : "px-3")}>
          <button
            type="button"
            onClick={() => setCustomizing(true)}
            title={compact ? "Настроить панель" : undefined}
            className={cn(
              "flex h-9 items-center gap-3 rounded-sm text-sm text-ink-subtle transition-colors duration-fast hover:bg-neutral hover:text-ink",
              compact ? "w-9 justify-center" : "w-full px-2",
              focusRing
            )}
          >
            <Icon name="sliders" className="h-[18px] w-[18px] shrink-0" />
            <span className={compact ? "sr-only" : "truncate"}>Настроить панель</span>
          </button>
          {isDesktop && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
              aria-controls="app-sidebar"
              title={`${collapsed ? "Развернуть" : "Свернуть"} панель ( [ )`}
              className={cn(
                "flex h-9 items-center gap-3 rounded-sm text-sm text-ink-subtle transition-colors duration-fast hover:bg-neutral hover:text-ink",
                compact ? "w-9 justify-center" : "w-full px-2",
                focusRing
              )}
            >
              <Icon name={collapsed ? "sidebarExpand" : "sidebarCollapse"} className="h-[18px] w-[18px] shrink-0" />
              <span className={compact ? "sr-only" : "truncate"}>{collapsed ? "Развернуть панель" : "Свернуть панель"}</span>
            </button>
          )}
        </div>
      </nav>

      <Modal
        open={customizing}
        onClose={() => setCustomizing(false)}
        size="sm"
        title="Настройка боковой панели"
        description="Оставьте только нужные разделы и расставьте их в удобном порядке. Скрытые разделы доступны из меню профиля."
        footer={
          <Button variant="primary" onClick={() => setCustomizing(false)}>
            Готово
          </Button>
        }
      >
        <SidebarCustomizer />
      </Modal>
    </>
  );
}
