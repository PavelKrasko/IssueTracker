import { request } from "./client";

const p = (pid) => `/projects/${pid}`;

export const commentsApi = {
  list: (pid, issueId) => request(`${p(pid)}/issues/${issueId}/comments`),
  create: (pid, issueId, body) => request(`${p(pid)}/issues/${issueId}/comments`, { method: "POST", body: { body } }),
  update: (pid, id, body) => request(`${p(pid)}/comments/${id}`, { method: "PATCH", body: { body } }),
  remove: (pid, id) => request(`${p(pid)}/comments/${id}`, { method: "DELETE" }),
};

export const watchersApi = {
  watch: (pid, issueId) => request(`${p(pid)}/issues/${issueId}/watchers/me`, { method: "PUT" }),
  unwatch: (pid, issueId) => request(`${p(pid)}/issues/${issueId}/watchers/me`, { method: "DELETE" }),
};

export const worklogsApi = {
  list: (pid, issueId) => request(`${p(pid)}/issues/${issueId}/worklogs`),
  create: (pid, issueId, data) => request(`${p(pid)}/issues/${issueId}/worklogs`, { method: "POST", body: data }),
  remove: (pid, id) => request(`${p(pid)}/worklogs/${id}`, { method: "DELETE" }),
};
