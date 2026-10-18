import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { sprintsApi, versionsApi } from "@/api/planningApi";
import { useIssues } from "./IssuesContext";
import { useProject } from "./ProjectContext";

const PlanningContext = createContext(null);

export function PlanningProvider({ children }) {
  const pid = useProject().current.id;
  const { issues, reload: reloadIssues } = useIssues();
  const [sprints, setSprints] = useState([]);
  const [versions, setVersions] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [s, v] = await Promise.all([sprintsApi.list(pid), versionsApi.list(pid)]);
      setSprints(s);
      setVersions(v);
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, [pid]);

  useEffect(() => {
    reload();
  }, [reload]);

  const issuesSignature = useMemo(() => issues.map((i) => `${i.id}:${i.status}:${i.sprintId}:${i.fixVersionId}:${i.points}`).join("|"), [issues]);
  useEffect(() => {
    if (status === "ready") reload();
  }, [issuesSignature]);

  const createSprint = useCallback(async (data) => {
    const s = await sprintsApi.create(pid, data);
    await reload();
    return s;
  }, [pid, reload]);
  const updateSprint = useCallback(async (id, patch) => {
    await sprintsApi.update(pid, id, patch);
    await reload();
  }, [pid, reload]);
  const deleteSprint = useCallback(async (id) => {
    await sprintsApi.remove(pid, id);
    await Promise.all([reload(), reloadIssues()]);
  }, [pid, reload, reloadIssues]);
  const startSprint = useCallback(async (id, data) => {
    await sprintsApi.start(pid, id, data);
    await reload();
  }, [pid, reload]);
  const completeSprint = useCallback(async (id, moveTo) => {
    const res = await sprintsApi.complete(pid, id, moveTo);
    await Promise.all([reload(), reloadIssues()]);
    return res;
  }, [pid, reload, reloadIssues]);

  const createVersion = useCallback(async (data) => {
    const v = await versionsApi.create(pid, data);
    await reload();
    return v;
  }, [pid, reload]);
  const updateVersion = useCallback(async (id, patch) => {
    await versionsApi.update(pid, id, patch);
    await reload();
  }, [pid, reload]);
  const deleteVersion = useCallback(async (id) => {
    await versionsApi.remove(pid, id);
    await Promise.all([reload(), reloadIssues()]);
  }, [pid, reload, reloadIssues]);

  const activeSprint = sprints.find((s) => s.state === "active") ?? null;
  const sprintById = useMemo(() => Object.fromEntries(sprints.map((s) => [s.id, s])), [sprints]);
  const versionById = useMemo(() => Object.fromEntries(versions.map((v) => [v.id, v])), [versions]);

  const value = useMemo(
    () => ({
      sprints, versions, status, error, reload, activeSprint, sprintById, versionById,
      createSprint, updateSprint, deleteSprint, startSprint, completeSprint, createVersion, updateVersion, deleteVersion,
    }),
    [sprints, versions, status, error, reload, activeSprint, sprintById, versionById,
      createSprint, updateSprint, deleteSprint, startSprint, completeSprint, createVersion, updateVersion, deleteVersion]
  );
  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>;
}

export function usePlanning() {
  const ctx = useContext(PlanningContext);
  if (!ctx) throw new Error("usePlanning должен использоваться внутри <PlanningProvider>");
  return ctx;
}
