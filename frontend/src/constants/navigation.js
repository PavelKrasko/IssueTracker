export const NAV_ITEMS = [
  { id: "board", label: "Доска", to: "/app/board", icon: "board", description: "Канбан-доска задач" },
  { id: "timeline", label: "Хронология", to: "/app/timeline", icon: "timeline", description: "Задачи на шкале времени" },
  { id: "issues", label: "Все задачи", to: "/app/issues", icon: "list", description: "Таблица с сортировкой и фильтрами" },
  { id: "sprints", label: "Спринты", to: "/app/sprints", icon: "sprint", description: "Бэклог, спринты и график сгорания" },
  { id: "releases", label: "Релизы", to: "/app/releases", icon: "release", description: "Версии продукта и списки изменений" },
  { id: "tree", label: "Иерархия", to: "/app/tree", icon: "tree", description: "Задачи и подзадачи на графе" },
  { id: "docs", label: "Документы", to: "/app/docs", icon: "docs", description: "Документация проекта" },
  { id: "stats", label: "Статистика", to: "/app/stats", icon: "chart", description: "Диаграммы и показатели" },
  { id: "teams", label: "Команды", to: "/app/teams", icon: "users", description: "Команды и участники" },
  { id: "project", label: "Проект", to: "/app/project", icon: "briefcase", description: "Участники, роли и настройки проекта" },
  { id: "profile", label: "Профиль", to: "/app/profile", icon: "user", description: "Ваши данные и аккаунты" },
  { id: "settings", label: "Настройки", to: "/app/settings", icon: "settings", description: "Тема и боковая панель" },
];

export const NAV_BY_ID = Object.fromEntries(NAV_ITEMS.map((i) => [i.id, i]));

export const DEFAULT_NAV = {
  order: NAV_ITEMS.map((i) => i.id),
  hidden: ["profile"],
};
