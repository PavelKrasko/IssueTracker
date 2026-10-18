import { API_URL, request, upload } from "./client";

export const authApi = {
  me: async () => {
    try {
      return await request("/auth/me");
    } catch (e) {
      if (e.status === 401) return null;
      throw e;
    }
  },
  login: (data) => request("/auth/login", { method: "POST", body: data }),
  register: (data) => request("/auth/register", { method: "POST", body: data }),
  logout: () => request("/auth/logout", { method: "POST" }).catch(() => null),

  oauth: (provider, { link = false } = {}) => {
    window.location.assign(`${API_URL}/auth/oauth/${provider}${link ? "?mode=link" : ""}`);
    return new Promise(() => {});
  },

  updateProfile: (patch) => request("/users/me", { method: "PATCH", body: patch }),
  changePassword: (data) => request("/users/me/password", { method: "POST", body: data }),
  disconnectProvider: (provider) => request(`/users/me/providers/${provider}`, { method: "DELETE" }),
  uploadAvatar: (file) => upload("/users/me/avatar", { file }),
  deleteAvatar: () => request("/users/me/avatar", { method: "DELETE" }),
};
