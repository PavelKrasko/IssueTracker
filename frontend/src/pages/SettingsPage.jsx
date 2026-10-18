import { Icon } from "@/components/icons";
import { SidebarCustomizer } from "@/components/settings/SidebarCustomizer";
import { Card, CardHeader, Kbd, PageHeader, Switch } from "@/components/ui";
import { usePreferences } from "@/context/PreferencesContext";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/utils/cn";

const THEMES = [
  { id: "light", label: "Светлая", icon: "sun" },
  { id: "dark", label: "Тёмная", icon: "moon" },
  { id: "system", label: "Как в системе", icon: "monitor" },
];

const SHORTCUTS = [
  ["C", "Создать задачу"],
  ["/", "Поиск задач"],
  ["[", "Свернуть или развернуть боковую панель"],
  ["Alt + ← / →", "Доска: перенести карточку. Хронология: сдвинуть даты"],
  ["Alt + Shift + ← / →", "Хронология: изменить срок"],
  ["Esc", "Закрыть окно или карточку"],
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { collapsed, setCollapsed } = usePreferences();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Настройки" subtitle="Хранятся в этом браузере" />

      <Card>
        <CardHeader title="Тема оформления" />
        <fieldset className="px-4 pb-4 pt-3 sm:px-5">
          <legend className="sr-only">Тема оформления</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {THEMES.map((t) => (
              <label
                key={t.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors duration-fast has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-line-focus",
                  theme === t.id ? "border-brand bg-brand-subtle" : "border-line hover:bg-surface-hovered"
                )}
              >
                <input type="radio" name="theme" value={t.id} checked={theme === t.id} onChange={() => setTheme(t.id)} className="sr-only" />
                <Icon name={t.icon} className={cn("h-5 w-5", theme === t.id ? "text-ink-brand" : "text-ink-subtle")} />
                <span className="flex-1 text-sm font-medium text-ink">{t.label}</span>
                {theme === t.id && <Icon name="checkCircle" className="h-4 w-4 text-ink-brand" />}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card>
        <CardHeader title="Боковая панель" description="Какие разделы показывать и в каком порядке" />
        <div className="flex flex-col gap-4 px-4 pb-4 pt-3 sm:px-5">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
            <div>
              <p id="collapsed-label" className="text-sm text-ink">
                Компактная панель
              </p>
              <p className="text-xs text-ink-subtlest">Только иконки, на экранах от 768px</p>
            </div>
            <Switch checked={collapsed} onChange={setCollapsed} label="Компактная панель" />
          </div>
          <SidebarCustomizer />
        </div>
      </Card>

      <Card>
        <CardHeader title="Горячие клавиши" />
        <dl className="divide-y divide-line px-4 pb-2 sm:px-5">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-ink">{label}</dt>
              <dd>
                <Kbd>{key}</Kbd>
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
