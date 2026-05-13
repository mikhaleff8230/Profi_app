import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

// Dev/preview auto-login config — only active when NODE_ENV !== 'production'
const DEV_AUTOLOGIN = process.env.NODE_ENV !== "production";
const DEV_PHONE = "+79031416581";
const DEV_PASSWORD = "Test12345!";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    let token = localStorage.getItem("token");

    // Dev mode: auto-login if no token yet so the UI loads without the login screen
    if (!token && DEV_AUTOLOGIN) {
      try {
        const { data } = await api.post("/auth/login", {
          phone: DEV_PHONE,
          password: DEV_PASSWORD,
        });
        localStorage.setItem("token", data.token);
        // Mock-user overlay merged with the real account so JWT-protected calls work
        setUser({ ...data.user, mock_id: 1, email: "test@example.com", mock_role: "admin" });
        setLoading(false);
        return;
      } catch {
        // Seed user not yet ready — fall through to anonymous state
      }
    }

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      // Keep the mock overlay in dev so role appears as "admin" to the UI checks that look for it
      setUser(DEV_AUTOLOGIN
        ? { ...data, mock_id: 1, email: "test@example.com", mock_role: "admin" }
        : data);
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
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    // In dev, immediately re-auth so the user can't actually log out
    if (DEV_AUTOLOGIN) fetchMe();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh: fetchMe, setUser, devMode: DEV_AUTOLOGIN }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
