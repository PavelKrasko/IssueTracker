import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageSpinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import BoardPage from "@/pages/BoardPage";
import DocsPage from "@/pages/DocsPage";
import IssuesPage from "@/pages/IssuesPage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ProfilePage from "@/pages/ProfilePage";
import ProjectSettingsPage from "@/pages/ProjectSettingsPage";
import RegisterPage from "@/pages/RegisterPage";
import ReleasesPage from "@/pages/ReleasesPage";
import SprintsPage from "@/pages/SprintsPage";
import TreePage from "@/pages/TreePage";
import SettingsPage from "@/pages/SettingsPage";
import StatsPage from "@/pages/StatsPage";
import TeamsPage from "@/pages/TeamsPage";
import TimelinePage from "@/pages/TimelinePage";
import WelcomePage from "@/pages/WelcomePage";

function RequireAuth({ children }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <PageSpinner label="Проверяем сессию…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function GuestOnly({ children }) {
  const { user, status } = useAuth();
  if (status === "loading") return <PageSpinner />;
  if (user) return <Navigate to="/app/board" replace />;
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />

      <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Navigate to="board" replace />} />
        <Route path="board" element={<BoardPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="sprints" element={<SprintsPage />} />
        <Route path="releases" element={<ReleasesPage />} />
        <Route path="tree" element={<TreePage />} />
        <Route path="docs" element={<DocsPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="project" element={<ProjectSettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="/dashboard" element={<Navigate to="/app/board" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
