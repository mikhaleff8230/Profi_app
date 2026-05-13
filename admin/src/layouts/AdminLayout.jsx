import { NavLink, Outlet, useNavigate } from "react-router-dom";

const nav = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/users", label: "Users" },
  { to: "/categories", label: "Categories" },
  { to: "/filters", label: "Filters" },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("admin_token");
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      <aside
        style={{
          width: 220,
          borderRight: "1px solid var(--border)",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div style={{ fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "1rem" }}>Proffi Admin</div>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              padding: "0.45rem 0.6rem",
              borderRadius: 6,
              color: isActive ? "#000" : "var(--muted)",
              background: isActive ? "var(--accent)" : "transparent",
              fontWeight: isActive ? 600 : 400,
            })}
          >
            {item.label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <button type="button" className="ghost" onClick={logout}>
          Logout
        </button>
      </aside>
      <main style={{ flex: 1, padding: "1.5rem 2rem", overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
