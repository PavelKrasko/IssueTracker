import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { projectsApi } from "@/api/projectsApi";
import { useAuth } from "./AuthContext";

const ProjectContext = createContext(null);
const KEY = "it_project";

const ROLE_RANK = { viewer: 0, member: 1, admin: 2, owner: 3 };
export const ROLE_LABELS = { owner: "Владелец", admin: "Администратор", member: "Участник", viewer: "Наблюдатель" };

const readSaved = () => {
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("project");
    if (fromUrl) {
      url.searchParams.delete("project");
      window.history.replaceState(window.history.state, "", url);
      localStorage.setItem(KEY, fromUrl);
      return fromUrl;
    }
  } catch {
  }
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export function ProjectProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [currentId, setCurrentId] = useState(readSaved);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);

  const select = useCallback((id) => {
    setCurrentId(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
    }
  }, []);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      setProjects(await projectsApi.list());
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const current = projects.find((p) => p.id === currentId) ?? projects[0] ?? null;

  const reloadMembers = useCallback(async () => {
    if (!current) return;
    const res = await projectsApi.members(current.id);
    setMembers(res.members);
    setInvites(res.invites);
  }, [current?.id]);

  useEffect(() => {
    setMembers([]);
    setInvites([]);
    reloadMembers().catch(() => {});
  }, [reloadMembers]);

  const createProject = useCallback(
    async (data) => {
      const p = await projectsApi.create(data);
      setProjects((list) => [...list, p]);
      select(p.id);
      return p;
    },
    [select]
  );

  const updateProject = useCallback(async (id, data) => {
    const p = await projectsApi.update(id, data);
    setProjects((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)));
    return p;
  }, []);

  const forget = (id) => setProjects((list) => list.filter((x) => x.id !== id));
  const deleteProject = useCallback(async (id) => {
    await projectsApi.remove(id);
    forget(id);
  }, []);
  const leaveProject = useCallback(async (id) => {
    await projectsApi.leave(id);
    forget(id);
  }, []);

  const addMember = useCallback(
    async (data) => {
      const res = await projectsApi.addMember(current.id, data);
      await reloadMembers();
      return res;
    },
    [current, reloadMembers]
  );
  const updateRole = useCallback(
    async (userId, role) => {
      await projectsApi.updateRole(current.id, userId, role);
      setMembers((list) => list.map((m) => (m.id === userId ? { ...m, role } : m)));
    },
    [current]
  );
  const removeMember = useCallback(
    async (userId) => {
      await projectsApi.removeMember(current.id, userId);
      setMembers((list) => list.filter((m) => m.id !== userId));
    },
    [current]
  );
  const deleteInvite = useCallback(
    async (inviteId) => {
      await projectsApi.deleteInvite(current.id, inviteId);
      setInvites((list) => list.filter((i) => i.id !== inviteId));
    },
    [current]
  );

  const role = current?.role ?? "viewer";
  const can = useMemo(
    () => ({ edit: ROLE_RANK[role] >= 1, admin: ROLE_RANK[role] >= 2, owner: role === "owner" }),
    [role]
  );

  const people = useMemo(
    () => members.map((m) => ({ id: m.id, name: m.name, email: m.email, avatarUrl: m.avatarUrl, role: m.role, isMe: m.id === user?.id })),
    [members, user?.id]
  );
  const personById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);

  const value = useMemo(
    () => ({
      projects, status, error, reload, current, select, role, can,
      members, invites, people, personById, reloadMembers,
      createProject, updateProject, deleteProject, leaveProject, addMember, updateRole, removeMember, deleteInvite,
    }),
    [projects, status, error, reload, current, select, role, can, members, invites, people, personById, reloadMembers,
      createProject, updateProject, deleteProject, leaveProject, addMember, updateRole, removeMember, deleteInvite]
  );
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject должен использоваться внутри <ProjectProvider>");
  return ctx;
}
