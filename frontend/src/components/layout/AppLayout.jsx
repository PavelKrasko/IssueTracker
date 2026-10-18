import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Button, EmptyState, PageSpinner } from "@/components/ui";
import { DocumentsProvider } from "@/context/DocumentsContext";
import { ProjectProvider, useProject } from "@/context/ProjectContext";
import CreateFirstProjectPage from "@/pages/CreateFirstProjectPage";
import { IssueUIProvider, useIssueUI } from "@/context/IssueUIContext";
import { IssuesProvider } from "@/context/IssuesContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { PlanningProvider } from "@/context/PlanningContext";
import { usePreferences } from "@/context/PreferencesContext";
import { TeamsProvider } from "@/context/TeamsContext";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  return (
    <NotificationsProvider>
      <ProjectProvider>
        <ProjectGate />
      </ProjectProvider>
    </NotificationsProvider>
  );
}

function ProjectGate() {
  const { status, error, reload, current } = useProject();
  if (status === "loading") return <PageSpinner label="Загружаем проекты…" />;
  if (status === "error")
    return (
      <div className="grid min-h-full place-items-center px-4">
        <EmptyState role="alert" tone="danger" icon="alert" title="Не удалось загрузить проекты" action={<Button variant="primary" onClick={reload}>Повторить</Button>}>
          {error}
        </EmptyState>
      </div>
    );
  if (!current) return <CreateFirstProjectPage />;
  return (
    <TeamsProvider key={current.id}>
      <IssuesProvider>
        <PlanningProvider>
          <DocumentsProvider>
            <IssueUIProvider>
              <Shell />
            </IssueUIProvider>
          </DocumentsProvider>
        </PlanningProvider>
      </IssuesProvider>
    </TeamsProvider>
  );
}

const isTyping = (el) => el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

function Shell() {
  const isDesktop = useIsDesktop();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { toggleCollapsed } = usePreferences();
  const { openCreate } = useIssueUI();
  const { can } = useProject();
  const searchRef = useRef(null);
  const mainRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (isDesktop) setMobileNavOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(document.activeElement)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if ((e.key === "c" || e.key === "с") && can.edit) {
        e.preventDefault();
        openCreate();
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "[" && isDesktop) {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDesktop, openCreate, toggleCollapsed, can.edit]);

  return (
    <div className="flex min-h-full flex-col bg-surface">
      <a
        href="#main"
        className="sr-only rounded-sm bg-brand px-3 py-2 text-sm text-ink-inverse focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60]"
      >
        Перейти к содержимому
      </a>
      <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} mobileNavOpen={mobileNavOpen} searchRef={searchRef} />
      <div className="flex min-h-0 flex-1">
        <Sidebar isDesktop={isDesktop} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 outline-none md:px-6 md:pt-6"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
