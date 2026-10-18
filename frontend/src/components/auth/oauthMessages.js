const NAMES = { google: "Google", github: "GitHub" };

export function oauthErrorMessage(code, provider) {
  const p = NAMES[provider] ?? "провайдера";
  switch (code) {
    case "disabled":
      return `Вход через ${p} пока не настроен на сервере. Администратору: добавьте ключи ${provider?.toUpperCase()}_CLIENT_ID и ${provider?.toUpperCase()}_CLIENT_SECRET в .env бэкенда.`;
    case "denied":
      return `Вход через ${p} отменён.`;
    case "state":
    case "session":
      return "Сессия входа устарела. Попробуйте ещё раз.";
    case "exchange":
      return `Не удалось получить данные от ${p}. Попробуйте ещё раз.`;
    case "no_email":
      return `${p} не передал подтверждённый email. Подтвердите email в аккаунте ${p} или зарегистрируйтесь по почте.`;
    case "taken":
      return `Этот аккаунт ${p} уже привязан к другому пользователю IssueTracker.`;
    case "already_linked":
      return `К вашему профилю уже привязан другой аккаунт ${p}. Сначала отключите его.`;
    default:
      return code ? `Не удалось войти через ${p}.` : "";
  }
}
