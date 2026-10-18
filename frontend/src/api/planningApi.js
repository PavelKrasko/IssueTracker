import { request } from "./client";

const p = (pid) => `/projects/${pid}`;

export const sprintsApi = {
  list: (pid) => request(`${p(pid)}/sprints`),
  create: (pid, data) => request(`${p(pid)}/sprints`, { method: "POST", body: data }),
  update: (pid, id, patch) => request(`${p(pid)}/sprints/${id}`, { method: "PATCH", body: patch }),
  remove: (pid, id) => request(`${p(pid)}/sprints/${id}`, { method: "DELETE" }),

  start: (pid, id, data = {}) => request(`${p(pid)}/sprints/${id}/start`, { method: "POST", body: data }),

  complete: (pid, id, moveTo = null) => request(`${p(pid)}/sprints/${id}/complete`, { method: "POST", body: { moveTo } }),

  burndown: (pid, id) => request(`${p(pid)}/sprints/${id}/burndown`),
};

export const versionsApi = {
  list: (pid) => request(`${p(pid)}/versions`),
  create: (pid, data) => request(`${p(pid)}/versions`, { method: "POST", body: data }),
  update: (pid, id, patch) => request(`${p(pid)}/versions/${id}`, { method: "PATCH", body: patch }),
  remove: (pid, id) => request(`${p(pid)}/versions/${id}`, { method: "DELETE" }),
};

export const timeReportApi = (pid, { from, to } = {}) => {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  return request(`${p(pid)}/time-report${q.toString() ? `?${q}` : ""}`);
};
