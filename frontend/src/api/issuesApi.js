import { request, upload } from "./client";

const base = (pid) => `/projects/${pid}/issues`;

export const issuesApi = {
  list: (pid) => request(base(pid)),
  create: (pid, data) => request(base(pid), { method: "POST", body: data }),
  update: (pid, id, patch) => request(`${base(pid)}/${id}`, { method: "PATCH", body: patch }),
  remove: (pid, id) => request(`${base(pid)}/${id}`, { method: "DELETE" }),
  events: (pid, id) => request(`${base(pid)}/${id}/events`),

  addAttachment: (pid, id, file) => upload(`${base(pid)}/${id}/attachments`, { file }),

  removeAttachment: (pid, id, attachmentId) => request(`${base(pid)}/${id}/attachments/${attachmentId}`, { method: "DELETE" }),
};
