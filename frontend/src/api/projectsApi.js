import { request } from "./client";

export const projectsApi = {
  list: () => request("/projects"),
  create: (data) => request("/projects", { method: "POST", body: data }),
  update: (pid, data) => request(`/projects/${pid}`, { method: "PATCH", body: data }),
  remove: (pid) => request(`/projects/${pid}`, { method: "DELETE" }),

  members: (pid) => request(`/projects/${pid}/members`),

  addMember: (pid, { email, role }) => request(`/projects/${pid}/members`, { method: "POST", body: { email, role } }),
  updateRole: (pid, userId, role) => request(`/projects/${pid}/members/${userId}`, { method: "PATCH", body: { role } }),
  removeMember: (pid, userId) => request(`/projects/${pid}/members/${userId}`, { method: "DELETE" }),
  leave: (pid) => request(`/projects/${pid}/members/me`, { method: "DELETE" }),
  deleteInvite: (pid, inviteId) => request(`/projects/${pid}/invites/${inviteId}`, { method: "DELETE" }),
};
