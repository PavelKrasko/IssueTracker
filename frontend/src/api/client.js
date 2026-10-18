export const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, { status, code, fields } = {}) {
    super(message);
    this.status = status;
    this.code = code;

    this.fields = fields;
  }
}

let onSessionExpired = () => {};
export const setSessionExpiredHandler = (fn) => (onSessionExpired = fn);

let refreshing = null;
async function refreshSession() {
  refreshing ??= fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

export async function request(path, { method = "GET", body, signal, retry = true } = {}) {
  const isForm = body instanceof FormData;
  const headers = { Accept: "application/json" };
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      credentials: "include",
      signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ApiError("Нет соединения с сервером. Проверьте интернет и попробуйте ещё раз.", { code: "NETWORK" });
  }

  if (res.status === 401 && retry && !NO_REFRESH.includes(path)) {
    if (await refreshSession()) return request(path, { method, body, signal, retry: false });
    onSessionExpired();
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.message || "Что-то пошло не так. Попробуйте ещё раз.", {
      status: res.status,
      code: data?.code,
      fields: data?.fields,
    });
  }
  return data;
}

export function upload(path, fields) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null && v !== "") form.append(k, v);
  return request(path, { method: "POST", body: form });
}
