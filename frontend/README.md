# IssueTracker — frontend

React 18 · Vite 5 · Tailwind CSS 3 · React Router 6 · react-icons. Данные — Go API из `../backend` (в dev-режиме Vite проксирует `/api` на `http://localhost:8080`).

## Запуск

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # сборка в dist/
```

Нужен Node.js 18+ (лучше 20/22). В WSL держите проект в `~/`, а не в `/mnt/c` или `/mnt/d`.

Сначала запустите API (см. `../README.md`). Первый вход — регистрация, затем создание проекта.

## Страницы

| Маршрут | Что там |
|---|---|
| `/` | Приветственная страница |
| `/register`, `/login` | Регистрация и вход: email + Google + GitHub |
| `/app/board` | Канбан-доска: перетаскивание, Alt+←/→, фильтры, создание в колонке |
| `/app/timeline` | Хронология: задачи на шкале (недели / месяцы / кварталы), перетаскивание и растягивание полос |
| `/app/issues` | Все задачи: таблица с сортировкой (на телефоне — карточки) |
| `/app/docs` | Документы проекта: файлы и ссылки, категории, поиск, привязка к задачам |
| `/app/stats` | Статистика: показатели, статусы, приоритеты, динамика, нагрузка |
| `/app/teams` | Команды из участников проекта |
| `/app/project` | Настройки проекта: участники, приглашения по email, роли |
| `/app/profile` | Профиль, мои задачи, связанные аккаунты, пароль |
| `/app/settings` | Тема, состав и порядок боковой панели, горячие клавиши |

### Хронология

- Полоса задачи — от «Начала» до «Срока». Если указана одна дата — полоса в один день. Задачи без дат — в списке «Без дат» с кнопкой «Запланировать на неделю».
- Мышь: перетащить полосу — сдвинуть даты, потянуть за край — изменить начало или срок, клик — открыть задачу.
- Клавиатура: Enter — открыть, Alt+←/→ — сдвинуть на день, Alt+Shift+←/→ — изменить срок.
- Цвет полосы — статус, красная обводка — просрочено. Масштаб запоминается.

### Документы

- Файлы (PDF, Word, Excel, PowerPoint, Markdown, изображения, ZIP, JSON/YAML — до 20 МБ) и ссылки на внешнюю документацию (Confluence, Google Docs, Figma…).
- Категории, поиск, сортировка, вид «Список» / «Плитки». У каждого документа — открыть, скачать, изменить, удалить.
- Документ можно привязать к задаче; в карточке задачи есть блок «Документы» с кнопками «Файл» и «Ссылка».
- Контракт API — в `src/api/docsApi.js`, справочники — в `src/constants/docs.js`.

### Вложения-изображения

- В форме задачи: перетащить файлы, выбрать кнопкой (на телефоне — галерея или камера) или вставить скриншот через Ctrl+V. Загружаются после «Создать / Сохранить».
- В карточке задачи: добавляются и удаляются сразу, просмотр во весь экран (←/→, свайп, Esc).
- Первое изображение — обложка карточки на доске, рядом со скрепкой счётчик.
- Лимиты в `src/utils/files.js`: PNG/JPG/GIF/WebP, до 5 МБ, до 10 на задачу.
- Файлы хранятся в S3/MinIO, отдаются через API по cookie-сессии.

Любая задача открывается справа по ссылке `?issue=IT-3`, с любой страницы.
Фильтры живут в адресной строке: `/app/board?priority=high&mine=1`.

## Структура

```
src/
  api/              запросы к Go API: client, auth, projects, issues, teams, docs
  app/router.jsx    маршруты, защита приватных страниц
  components/
    ui/             базовые компоненты: Button, поля, Modal, Drawer, Menu, Avatar…
    icons/          SVG-иконки
    layout/         AppLayout, Topbar, Sidebar, GlobalSearch, ThemeToggle, Logo
    auth/           AuthLayout, SocialAuthButtons
    issues/         Board, IssueCard, IssueTable, IssueFilters, IssueFormModal, IssueDetailsDrawer
    attachments/    AttachmentDropzone, AttachmentGrid, ImageLightbox, IssueAttachments
    docs/           DocUploadModal, DocFormModal, DocList, DocActions, IssueDocs
    timeline/       Timeline (диаграмма Ганта), timelineScale
    charts/         DonutChart, BarList, TrendChart, StatTile, ChartCard
    teams/          TeamCard, TeamFormModal
    settings/       SidebarCustomizer
  constants/        справочники: статусы, типы, приоритеты, разделы меню
  context/          Auth, Theme, Toast, Issues, Teams, Preferences, IssueUI
  hooks/            useDialog, useIssueFilters, useMediaQuery, useLocalStorage…
  pages/            страницы
  styles/index.css  дизайн-токены (CSS-переменные) для светлой и тёмной темы
  utils/            форматирование, валидация, расчёт статистики
```

## Работа с API

- `src/api/client.js` — fetch-обёртка: cookie-сессия, автоматический `/auth/refresh` при 401, ошибки `{ message, code, fields }` (`fields` подсвечиваются у полей формы).
- `src/api/*Api.js` — по файлу на ресурс; путь задач/команд/документов включает id проекта.
- `src/context/ProjectContext.jsx` — список проектов, текущий проект, участники и роль (`can.edit`, `can.admin`, `can.owner`).
- Если API на другом домене — `VITE_API_URL=https://api.example.com/api` и `ALLOWED_ORIGINS` на бэкенде.

## Дизайн-токены

Цвета заданы в `src/styles/index.css` CSS-переменными (`:root` — светлая тема, `.dark` — тёмная) и подключены в `tailwind.config.js` семантическими именами:
`bg-surface`, `bg-surface-sunken`, `text-ink`, `text-ink-subtle`, `border-line`, `bg-brand`, `text-danger-text`, `bg-chart-1` и т.д.
В компонентах — только эти классы, без hex-значений, поэтому обе темы работают автоматически.

Иконки — библиотека `react-icons` (набор Lucide + брендовые FcGoogle/FaGithub), подключены через единый компонент `components/icons`.

## Доступность

- Всё доступно с клавиатуры, фокус всегда виден.
- Окна удерживают фокус, закрываются по Esc и возвращают фокус обратно.
- У диаграмм есть переключатель «Таблица», цвет никогда не единственный носитель смысла.
- Учитывается `prefers-reduced-motion`.

Горячие клавиши: `C` — новая задача, `/` — поиск, `[` — свернуть панель.
