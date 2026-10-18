import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ProjectFields } from "@/components/projects/ProjectForm";
import { Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useProject } from "@/context/ProjectContext";
import { useToast } from "@/context/ToastContext";

export default function CreateFirstProjectPage() {
  const { user, logout } = useAuth();
  const { createProject, reload } = useProject();
  const toast = useToast();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-col bg-surface-sunken">
      <header className="flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Logo to="/" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="subtle"
            iconBefore="logOut"
            onClick={async () => {
              await logout();
              navigate("/", { replace: true });
            }}
          >
            Выйти
          </Button>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-10 sm:items-center">
        <div className="w-full max-w-lg">
          <div className="rounded-lg bg-surface-raised p-6 shadow-overlay sm:p-8">
            <h1 className="text-xl font-semibold text-ink">Создайте первый проект, {user.name.split(" ")[0]}</h1>
            <p className="mt-1 text-sm text-ink-subtle">В проекте будут задачи, доска, команды и документы. Коллег пригласите по email после создания.</p>
            <div className="mt-6">
              <ProjectFields
                submitLabel="Создать проект"
                onSubmit={async (data) => {
                  const p = await createProject(data);
                  toast(`Проект «${p.name}» создан`);
                  navigate("/app/board", { replace: true });
                }}
              />
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-line bg-surface p-4 text-sm text-ink-subtle">
            Ждёте приглашения? Попросите администратора проекта добавить <span className="font-semibold text-ink">{user.email}</span>, затем{" "}
            <button type="button" onClick={reload} className="rounded-sm font-semibold text-ink-brand hover:underline">
              обновите список проектов
            </button>
            .
          </div>
        </div>
      </main>
    </div>
  );
}
