import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { notificationsApi } from "@/api/notificationsApi";

const NotificationsContext = createContext(null);
const POLL_MS = 30_000;

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState("loading");
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await notificationsApi.list({ limit: 50 });
      setItems(res.items);
      setUnread(res.unread);
      setStatus("ready");
    } catch {
      setStatus((s) => (s === "loading" ? "error" : s));
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const markRead = useCallback(async (ids) => {
    const all = ids === "all";
    setItems((list) => list.map((n) => (all || ids.includes(n.id) ? { ...n, read: true } : n)));
    try {
      const res = await notificationsApi.read(ids);
      setUnread(res.unread);
    } catch {
      refresh();
    }
  }, [refresh]);

  const value = useMemo(() => ({ items, unread, status, refresh, markRead }), [items, unread, status, refresh, markRead]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications должен использоваться внутри <NotificationsProvider>");
  return ctx;
}
