import { request } from "./client";

export const notificationsApi = {
  list: ({ unread = false, limit = 50 } = {}) => request(`/notifications?limit=${limit}${unread ? "&unread=1" : ""}`),

  read: (ids) => request("/notifications/read", { method: "POST", body: ids === "all" ? { all: true } : { ids } }),
};

export const telegramApi = {
  get: () => request("/users/me/telegram"),
  link: () => request("/users/me/telegram/link", { method: "POST" }),
  setEnabled: (enabled) => request("/users/me/telegram", { method: "PATCH", body: { enabled } }),
  unlink: () => request("/users/me/telegram", { method: "DELETE" }),
};
