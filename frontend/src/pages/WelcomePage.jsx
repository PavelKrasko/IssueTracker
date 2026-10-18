import { Icon } from "@/components/icons";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ButtonLink } from "@/components/ui";
import { STATUSES } from "@/constants/issues";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";

const FEATURES = [
  { icon: "board", title: "Канбан-доска", text: "Перетаскивайте задачи между колонками или переносите их с клавиатуры." },
  { icon: "filter", title: "Поиск и фильтры", text: "Тип, приоритет, исполнитель, команда, просроченные. Фильтр сохраняется в ссылке." },
  { icon: "chart", title: "Статистика", text: "Распределение по статусам, нагрузка на людей и динамика за две недели." },
  { icon: "users", title: "Команды", text: "Соберите участников в команды и назначайте им задачи." },
  { icon: "moon", title: "Светлая и тёмная тема", text: "Переключается в один клик или следует настройкам системы." },
  { icon: "sliders", title: "Своя боковая панель", text: "Оставьте в панели только нужные разделы и сверните её до иконок." },
];

const STEPS = [
  { title: "Создайте аккаунт", text: "Через email, Google или GitHub." },
  { title: "Соберите команду", text: "Добавьте коллег, чтобы назначать им задачи." },
  { title: "Заведите задачи", text: "Тип, приоритет, срок и оценка — всё в одной форме." },
];

const PREVIEW = [
  [{ k: "IT-4", t: "Экспорт задач в CSV", c: "bg-brand" }, { k: "IT-7", t: "Фильтр по команде", c: "bg-success" }],
  [{ k: "IT-2", t: "Падает загрузка аватара", c: "bg-danger" }],
  [{ k: "IT-5", t: "Тёмная тема для графиков", c: "bg-brand" }],
  [{ k: "IT-1", t: "Вход через GitHub", c: "bg-success" }],
];

function BoardPreview() {
  return (
    <div aria-hidden="true" className="rounded-xl border border-line bg-surface-raised p-3 shadow-overlay">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-pressed" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-pressed" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-pressed" />
        <span className="ml-2 text-xs font-semibold text-ink-subtle">Доска IT</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUSES.map((s, i) => (
          <div key={s.id} className={cn("min-w-0 rounded-md bg-surface-sunken p-2", i > 1 && "hidden sm:block")}>
            <p className="mb-2 flex items-center gap-1.5 truncate text-2xs font-semibold uppercase text-ink-subtle">
              <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
              {s.label}
            </p>
            <div className="flex flex-col gap-2">
              {PREVIEW[i].map((c) => (
                <div key={c.k} className="rounded-sm bg-surface-raised p-2 shadow-raised">
                  <p className="line-clamp-2 text-xs text-ink">{c.t}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={cn("h-3 w-3 rounded-xs", c.c)} />
                    <span className="text-2xs font-semibold text-ink-subtle">{c.k}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-full flex-col bg-surface">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <Logo />
          <nav aria-label="Аккаунт" className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {user ? (
              <ButtonLink to="/app/board" variant="primary">
                Открыть доску
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="subtle">
                  Войти
                </ButtonLink>
                <ButtonLink to="/register" variant="primary" className="hidden min-[400px]:inline-flex">
                  Регистрация
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-brand">Трекер задач для команд</p>
            <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-[34px] sm:leading-[40px]">Планируйте спринт и доводите задачи до «Готово»</h1>
            <p className="mt-4 max-w-prose text-base text-ink-subtle">
              Задачи, баги и истории на одной доске. Видно, кто чем занят, что просрочено и сколько закрыто за неделю.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {user ? (
                <ButtonLink to="/app/board" variant="primary" size="lg" iconAfter="arrowRight">
                  Перейти к доске
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to="/register" variant="primary" size="lg" iconAfter="arrowRight">
                    Начать бесплатно
                  </ButtonLink>
                  <ButtonLink to="/login" variant="outline" size="lg">
                    У меня есть аккаунт
                  </ButtonLink>
                </>
              )}
            </div>
            <ul className="mt-6 flex flex-col gap-2 text-sm text-ink-subtle sm:flex-row sm:gap-5">
              {["Без карты и пробного периода", "Вход через Google или GitHub"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Icon name="check" className="h-4 w-4 text-success" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            <BoardPreview />
          </div>
        </section>

        <section aria-labelledby="features" className="border-y border-line bg-surface-sunken">
          <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
            <h2 id="features" className="text-xl font-semibold text-ink">
              Всё для ежедневной работы
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-brand-subtle text-ink-brand">
                    <Icon name={f.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold text-ink">{f.title}</h3>
                  <p className="text-sm text-ink-subtle">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="steps" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <h2 id="steps" className="text-xl font-semibold text-ink">
            Как начать
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-ink-inverse">{i + 1}</span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 text-sm text-ink-subtle">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>

          {!user && (
            <div className="mt-12 flex flex-col items-start gap-4 rounded-xl bg-brand-subtle p-6 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-ink">Попробуйте на своём проекте</p>
                <p className="mt-1 text-sm text-ink-subtle">Регистрация занимает меньше минуты.</p>
              </div>
              <ButtonLink to="/register" variant="primary" size="lg">
                Создать аккаунт
              </ButtonLink>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-xs text-ink-subtlest">© {new Date().getFullYear()} IssueTracker</div>
      </footer>
    </div>
  );
}
