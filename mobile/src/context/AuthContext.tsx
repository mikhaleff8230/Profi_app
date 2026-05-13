import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, getToken, setToken } from "../api";

export type UserRole = "customer" | "specialist";

export type User = {
  id: number | string;
  email?: string | null;
  name: string;
  role: UserRole;
  is_verified?: boolean;
  bio?: string | null;
  city?: string | null;
  phone?: string | null;
  avatar?: string | null;
  services?: string[];
  rating?: number;
  reviews_count?: number;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  refreshMe: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return;
    }
    const me = await apiFetch("/auth/me", { method: "GET" });
    setUser(me as User);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await refreshMe();
      } catch {
        await setToken(null);
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshMe]);

  const signIn = useCallback(async (token: string, u: User) => {
    await setToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, setUser, refreshMe, signIn, logout }),
    [user, loading, refreshMe, signIn, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
