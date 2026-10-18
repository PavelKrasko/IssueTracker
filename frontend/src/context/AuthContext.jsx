import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "@/api/authApi";
import { setSessionExpiredHandler } from "@/api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    let alive = true;
    authApi
      .me()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setStatus("ready"));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (data) => setUser(await authApi.login(data)), []);
  const register = useCallback(async (data) => setUser(await authApi.register(data)), []);

  const oauthLogin = useCallback((provider) => authApi.oauth(provider), []);

  const linkProvider = useCallback((provider) => authApi.oauth(provider, { link: true }), []);
  const disconnectProvider = useCallback(async (provider) => setUser(await authApi.disconnectProvider(provider)), []);
  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);
  const updateProfile = useCallback(async (patch) => setUser(await authApi.updateProfile(patch)), []);
  const uploadAvatar = useCallback(async (file) => setUser(await authApi.uploadAvatar(file)), []);
  const removeAvatar = useCallback(async () => setUser(await authApi.deleteAvatar()), []);
  const changePassword = useCallback(async (data) => {
    await authApi.changePassword(data);
    setUser((u) => (u ? { ...u, hasPassword: true } : u));
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, oauthLogin, linkProvider, disconnectProvider, logout, updateProfile, changePassword, uploadAvatar, removeAvatar }),
    [user, status, login, register, oauthLogin, linkProvider, disconnectProvider, logout, updateProfile, changePassword, uploadAvatar, removeAvatar]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  return ctx;
}
