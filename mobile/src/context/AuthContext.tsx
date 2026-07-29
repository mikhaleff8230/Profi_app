import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Linking, Platform } from "react-native";
import { apiFetch, getToken, setToken } from "../api";
import { resetEcho } from "../services/realtime";
import { registerPushNotifications, subscribeToNotificationLinks, unregisterPushNotifications } from "../services/pushNotifications";

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
  portfolio?: string[];
  services?: string[];
  rating?: number;
  reviews_count?: number;
};

/** В dev (`expo start`) пропускаем экран входа. В .env: EXPO_PUBLIC_SKIP_AUTH=0 — снова проверять логин. */
const DEV_SKIP_AUTH =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  (process.env.EXPO_PUBLIC_SKIP_AUTH ?? "0") !== "0";

const DEV_MOCK_USER: User = {
  id: "local-dev-user",
  name: "Локальная разработка",
  role: "specialist",
  email: "dev@local",
  is_verified: true,
  phone: "+70000000000",
};

function isAllowedAppUser(user: User | null | undefined): user is User {
  return user?.role === "specialist";
}

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

  const consumeOAuthUrl = useCallback(async (url: string | null | undefined): Promise<boolean> => {
    if (!url) return false;
    const tokenMatch = url.match(/[?&]token=([^&#]+)/);
    if (!tokenMatch?.[1]) return false;
    const token = decodeURIComponent(tokenMatch[1].replace(/\+/g, "%20"));
    await setToken(token);
    const me = await apiFetch("/auth/me", { method: "GET" });
    if (!isAllowedAppUser(me as User)) {
      await setToken(null);
      setUser(null);
      return false;
    }
    setUser(me as User);
    if (Platform.OS === "web" && typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname || "/");
    }
    return true;
  }, []);

  const refreshMe = useCallback(async () => {
    if (DEV_SKIP_AUTH) {
      setUser(DEV_MOCK_USER);
      return;
    }
    const token = await getToken();
    if (!token) {
      setUser(null);
      return;
    }
    const me = await apiFetch("/auth/me", { method: "GET" });
    if (!isAllowedAppUser(me as User)) {
      await setToken(null);
      setUser(null);
      return;
    }
    setUser(me as User);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (DEV_SKIP_AUTH) {
        if (alive) {
          setUser(DEV_MOCK_USER);
          setLoading(false);
        }
        return;
      }
      try {
        let consumed = false;
        if (Platform.OS === "web" && typeof window !== "undefined") {
          consumed = await consumeOAuthUrl(window.location.href);
        } else {
          consumed = await consumeOAuthUrl(await Linking.getInitialURL());
        }
        if (!consumed) {
          await refreshMe();
        }
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
  }, [consumeOAuthUrl, refreshMe]);

  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    const sub = Linking.addEventListener("url", ({ url }) => {
      consumeOAuthUrl(url).catch(() => undefined);
    });
    return () => sub.remove();
  }, [consumeOAuthUrl]);

  useEffect(() => {
    if (!user || user.role !== "specialist") return undefined;
    void registerPushNotifications();
    const subscription = subscribeToNotificationLinks();
    return () => subscription.remove();
  }, [user]);

  const signIn = useCallback(async (token: string, u: User) => {
    if (!isAllowedAppUser(u)) {
      await setToken(null);
      setUser(null);
      throw new Error("Приложение доступно только мастерам");
    }
    resetEcho();
    await setToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    resetEcho();
    await unregisterPushNotifications();
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
