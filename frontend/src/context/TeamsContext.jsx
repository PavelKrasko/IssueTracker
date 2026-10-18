import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { teamsApi } from "@/api/teamsApi";
import { useProject } from "./ProjectContext";

const TeamsContext = createContext(null);

export function TeamsProvider({ children }) {
  const { current, people, personById } = useProject();
  const pid = current.id;
  const [teams, setTeams] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      setTeams(await teamsApi.list(pid));
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, [pid]);

  useEffect(() => {
    reload();
  }, [reload]);

  const replace = (team) => setTeams((list) => list.map((t) => (t.id === team.id ? team : t)));

  const createTeam = useCallback(
    async (data) => {
      const team = await teamsApi.create(pid, data);
      setTeams((list) => [...list, team]);
      return team;
    },
    [pid]
  );
  const updateTeam = useCallback(
    async (id, data) => {
      const team = await teamsApi.update(pid, id, data);
      replace(team);
      return team;
    },
    [pid]
  );
  const deleteTeam = useCallback(
    async (id) => {
      await teamsApi.remove(pid, id);
      setTeams((list) => list.filter((t) => t.id !== id));
    },
    [pid]
  );
  const addMember = useCallback(async (teamId, data) => replace(await teamsApi.addMember(pid, teamId, data)), [pid]);
  const removeMember = useCallback(async (teamId, userId) => replace(await teamsApi.removeMember(pid, teamId, userId)), [pid]);

  const teamById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);

  const value = useMemo(
    () => ({ teams, status, error, reload, createTeam, updateTeam, deleteTeam, addMember, removeMember, people, personById, teamById }),
    [teams, status, error, reload, createTeam, updateTeam, deleteTeam, addMember, removeMember, people, personById, teamById]
  );
  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>;
}

export function useTeams() {
  const ctx = useContext(TeamsContext);
  if (!ctx) throw new Error("useTeams должен использоваться внутри <TeamsProvider>");
  return ctx;
}
