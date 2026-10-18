import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { issuesApi } from "@/api/issuesApi";
import { STATUS_BY_ID } from "@/constants/issues";
import { useProject } from "./ProjectContext";
import { useToast } from "./ToastContext";

const IssuesContext = createContext(null);

export function IssuesProvider({ children }) {
  const toast = useToast();
  const pid = useProject().current.id;
  const [issues, setIssues] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const issuesRef = useRef(issues);
  issuesRef.current = issues;

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      setIssues(await issuesApi.list(pid));
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, [pid]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createIssue = useCallback(async (data) => {
    const created = await issuesApi.create(pid, data);
    setIssues((list) => [created, ...list]);
    return created;
  }, [pid]);

  const updateIssue = useCallback(async (id, patch) => {
    const updated = await issuesApi.update(pid, id, patch);
    setIssues((list) => list.map((i) => (i.id === id ? updated : i)));
    return updated;
  }, [pid]);

  const moveIssue = useCallback(
    async (id, statusId) => {
      const previous = issuesRef.current.find((i) => i.id === id);
      if (!previous || previous.status === statusId) return;
      setIssues((list) => list.map((i) => (i.id === id ? { ...i, status: statusId } : i)));
      try {
        const updated = await issuesApi.update(pid, id, { status: statusId });
        setIssues((list) => list.map((i) => (i.id === id ? updated : i)));
      } catch (e) {
        setIssues((list) => list.map((i) => (i.id === id ? previous : i)));
        toast(`Не удалось перенести ${previous.key} в «${STATUS_BY_ID[statusId].label}». ${e.message}`, { tone: "error" });
      }
    },
    [toast, pid]
  );

  const deleteIssue = useCallback(async (id) => {
    await issuesApi.remove(pid, id);

    setIssues((list) => list.filter((i) => i.id !== id).map((i) => (i.parentId === id ? { ...i, parentId: null } : i)));
  }, [pid]);

  const addAttachments = useCallback(async (issueId, files) => {
    const failed = [];
    for (const file of files) {
      try {
        const updated = await issuesApi.addAttachment(pid, issueId, file);
        setIssues((list) => list.map((i) => (i.id === issueId ? updated : i)));
      } catch (e) {
        failed.push({ name: file.name, message: e.message });
      }
    }
    return failed;
  }, [pid]);

  const removeAttachment = useCallback(async (issueId, attachmentId) => {
    const updated = await issuesApi.removeAttachment(pid, issueId, attachmentId);
    setIssues((list) => list.map((i) => (i.id === issueId ? updated : i)));
  }, [pid]);

  const patchLocal = useCallback((id, patch) => {
    setIssues((list) => list.map((i) => (i.id === id ? { ...i, ...(typeof patch === "function" ? patch(i) : patch) } : i)));
  }, []);

  const byKey = useMemo(() => Object.fromEntries(issues.map((i) => [i.key, i])), [issues]);

  const byId = useMemo(() => Object.fromEntries(issues.map((i) => [i.id, i])), [issues]);

  const childrenOf = useMemo(() => {
    const map = {};
    for (const i of issues) if (i.parentId) (map[i.parentId] ??= []).push(i);
    for (const list of Object.values(map)) list.sort((a, b) => a.number - b.number);
    return map;
  }, [issues]);

  const value = useMemo(
    () => ({ issues, byKey, byId, childrenOf, status, error, reload, createIssue, updateIssue, moveIssue, deleteIssue, addAttachments, removeAttachment, patchLocal }),
    [issues, byKey, byId, childrenOf, status, error, reload, createIssue, updateIssue, moveIssue, deleteIssue, addAttachments, removeAttachment, patchLocal]
  );
  return <IssuesContext.Provider value={value}>{children}</IssuesContext.Provider>;
}

export function useIssues() {
  const ctx = useContext(IssuesContext);
  if (!ctx) throw new Error("useIssues должен использоваться внутри <IssuesProvider>");
  return ctx;
}
