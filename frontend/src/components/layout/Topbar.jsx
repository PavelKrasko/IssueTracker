import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, IconButton, Menu } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useIssueUI } from "@/context/IssueUIContext";
import { useProject } from "@/context/ProjectContext";
import { useTheme } from "@/context/ThemeContext";
import { cn, focusRing } from "@/utils/cn";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GlobalSearch } from "./GlobalSearch";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({ onOpenMobileNav, mobileNavOpen, searchRef }) {
  const { user, logout } = useAuth();
  const { openCreate } = useIssueUI();
  const { can } = useProject();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileSearch, setMobileSearch] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        {mobileSearch ? (
          <>
            <GlobalSearch autoFocus className="flex-1" onDone={() => setMobileSearch(false)} />
            <Button variant="subtle" onClick={() => setMobileSearch(false)}>
              Отмена
            </Button>
          </>
        ) : (
          <>
            <IconButton
              icon="menu"
              label="Открыть меню"
              aria-expanded={mobileNavOpen}
              aria-controls="app-sidebar"
              onClick={onOpenMobileNav}
              className="md:hidden"
            />
            <Logo to="/app/board" showText={false} className="md:hidden" />
            <Logo to="/app/board" className="hidden md:inline-flex" />

            <GlobalSearch ref={searchRef} className="ml-4 hidden max-w-md flex-1 md:block" />

            <div className="ml-auto flex items-center gap-1">
              <IconButton icon="search" label="Поиск задач" onClick={() => setMobileSearch(true)} className="md:hidden" />
              {can.edit && (
                <Button variant="primary" iconBefore="plus" onClick={() => openCreate()} aria-label="Создать задачу" title="Создать задачу (C)">
                  <span className="hidden sm:inline">Создать</span>
                </Button>
              )}
              <NotificationBell />
              <ThemeToggle className="hidden sm:inline-flex" />
              <Menu
                header={
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-xs text-ink-subtle">{user.email}</p>
                  </div>
                }
                items={[
                  { label: "Профиль", icon: "user", to: "/app/profile" },
                  { label: "Настройки проекта", icon: "briefcase", to: "/app/project" },
                  { label: "Настройки", icon: "settings", to: "/app/settings" },
                  { label: resolvedTheme === "dark" ? "Светлая тема" : "Тёмная тема", icon: resolvedTheme === "dark" ? "sun" : "moon", onSelect: toggleTheme },
                  { label: "Выйти", icon: "logOut", onSelect: onLogout, separatorBefore: true, keepFocusAway: true },
                ]}
                renderTrigger={({ ref, props }) => (
                  <button ref={ref} type="button" aria-label={`Меню пользователя: ${user.name}`} className={cn("ml-1 rounded-full", focusRing)} {...props}>
                    <Avatar person={user} size="md" decorative />
                  </button>
                )}
              />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
