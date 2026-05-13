import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

const IS_DEV = process.env.NODE_ENV !== "production";
const FORCE_AUTOLOGIN =
  process.env.REACT_APP_AUTOLOGIN === "true" || process.env.REACT_APP_AUTOLOGIN === "1";
/** Включает автологин: в dev всегда; в production — только если REACT_APP_AUTOLOGIN=true (временно, небезопасно). */
const AUTOLOGIN_ACTIVE = IS_DEV || FORCE_AUTOLOGIN;

function getAutoLoginCredentials() {
  const p = process.env.REACT_APP_AUTOLOGIN_PHONE?.trim();
  const w = process.env.REACT_APP_AUTOLOGIN_PASSWORD;
  if (p && w) return { phone: p, password: w };
  if (IS_DEV && !FORCE_AUTOLOGIN) return { phone: "+79031416581", password: "Test12345!" };
  return { phone: "+10000000001", password: "admin123" };
}

function withDevMock(user) {
  if (!user) return null;
  if (IS_DEV && !FORCE_AUTOLOGIN) {
    return { ...user, mock_id: 1, email: "test@example.com", mock_role: "admin" };
  }
  return user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    let token = localStorage.getItem("token");

    if (!token && AUTOLOGIN_ACTIVE) {
      try {
        const { phone, password } = getAutoLoginCredentials();
        const { data } = await api.post("/auth/login", { phone, password });
        localStorage.setItem("token", data.token);
        setUser(withDevMock(data.user));
        setLoading(false);
        return;
      } catch {
        // Пользователь ещё не создан (нет seed) — показываем экран входа
      }
    }

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(withDevMock(data));
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (phone, password) => {
    const { data } = await api.post("/auth/login", { phone, password });
    localStorage.setItem("token", data.token);
    setUser(withDevMock(data.user));
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register-phone", payload);
    localStorage.setItem("token", data.token);
    setUser(withDevMock(data.user));
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    if (AUTOLOGIN_ACTIVE) fetchMe();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refresh: fetchMe,
        setUser,
        devMode: IS_DEV,
        autoLogin: AUTOLOGIN_ACTIVE,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
