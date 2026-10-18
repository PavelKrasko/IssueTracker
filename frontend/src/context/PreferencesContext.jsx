import { createContext, useCallback, useContext, useMemo } from "react";
import { DEFAULT_NAV, NAV_BY_ID, NAV_ITEMS } from "@/constants/navigation";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const PreferencesContext = createContext(null);

function sanitizeNav(nav) {
  const known = new Set(NAV_ITEMS.map((i) => i.id));
  const order = (nav?.order ?? []).filter((id) => known.has(id));
  for (const item of NAV_ITEMS) if (!order.includes(item.id)) order.push(item.id);
  const hidden = (nav?.hidden ?? []).filter((id) => known.has(id));
  return { order, hidden };
}

export function PreferencesProvider({ children }) {
  const [collapsed, setCollapsed] = useLocalStorage("it_sidebar_collapsed", false);
  const [rawNav, setRawNav] = useLocalStorage("it_nav", DEFAULT_NAV);
  const nav = useMemo(() => sanitizeNav(rawNav), [rawNav]);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), [setCollapsed]);

  const setVisible = useCallback(
    (id, visible) =>
      setRawNav((prev) => {
        const n = sanitizeNav(prev);
        const hidden = visible ? n.hidden.filter((x) => x !== id) : [...new Set([...n.hidden, id])];

        if (hidden.length >= n.order.length) return n;
        return { ...n, hidden };
      }),
    [setRawNav]
  );

  const move = useCallback(
    (id, direction) =>
      setRawNav((prev) => {
        const n = sanitizeNav(prev);
        const from = n.order.indexOf(id);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= n.order.length) return n;
        const order = [...n.order];
        [order[from], order[to]] = [order[to], order[from]];
        return { ...n, order };
      }),
    [setRawNav]
  );

  const resetNav = useCallback(() => setRawNav(DEFAULT_NAV), [setRawNav]);

  const visibleItems = useMemo(() => nav.order.filter((id) => !nav.hidden.includes(id)).map((id) => NAV_BY_ID[id]), [nav]);

  const value = useMemo(
    () => ({ collapsed, setCollapsed, toggleCollapsed, nav, visibleItems, setVisible, move, resetNav }),
    [collapsed, setCollapsed, toggleCollapsed, nav, visibleItems, setVisible, move, resetNav]
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences должен использоваться внутри <PreferencesProvider>");
  return ctx;
}
