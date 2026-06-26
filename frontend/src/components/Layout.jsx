import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Home, ClipboardList, MessageCircle, User, ChevronLeft } from "lucide-react";
import { useLang } from "../i18n";
import { useAuth } from "../auth";

export function AppShell({ children }) {
  return (
    <div className="app-shell">
      <div className="app-frame">{children}</div>
    </div>
  );
}

export function TopBar({ title, onBack, right }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-white sticky top-0 z-30">
      {onBack !== false ? (
        <button
          data-testid="top-back-btn"
          onClick={() => (onBack ? onBack() : navigate(-1))}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-lavender-50 transition-colors"
        >
          <ChevronLeft size={26} strokeWidth={2} />
        </button>
      ) : (
        <div className="w-10" />
      )}
      <h2 className="text-lg font-bold tracking-tight truncate flex-1 text-center px-2">{title}</h2>
      <div className="w-10 flex justify-end">{right}</div>
    </div>
  );
}

export function BottomTabs() {
  const { t } = useLang();
  const { user } = useAuth();
  const location = useLocation();
  // Hide on certain routes
  const hide = ["/", "/login", "/register"].includes(location.pathname) || location.pathname.startsWith("/chat/") || location.pathname === "/map";
  if (hide || !user) return null;

  const tabs = [
    { to: "/home", icon: Home, label: t("tab_home"), testid: "tab-home" },
    { to: "/orders", icon: ClipboardList, label: t("tab_orders"), testid: "tab-orders" },
    { to: "/chats", icon: MessageCircle, label: t("tab_chats"), testid: "tab-chats" },
    { to: "/profile", icon: User, label: t("tab_profile"), testid: "tab-profile" },
  ];

  return (
    <div className="border-t border-neutral-100 bg-white flex justify-around items-center px-2 py-2">
      {tabs.map(({ to, icon: Icon, label, testid }) => (
        <NavLink
          key={to}
          to={to}
          data-testid={testid}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 w-16 py-1 transition-colors ${isActive ? "text-black" : "text-neutral-400"}`
          }
        >
          <Icon size={22} strokeWidth={2} />
          <span className="text-[10px] font-semibold">{label}</span>
        </NavLink>
      ))}
    </div>
  );
}

export function Page({ children, className = "" }) {
  return <div className={`scroll-area ${className}`}>{children}</div>;
}

export function Empty({ icon: Icon, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-4">
      {Icon && <Icon size={56} strokeWidth={1.2} className="text-neutral-300" />}
      <p className="text-neutral-500 text-base">{text}</p>
      {action}
    </div>
  );
}

export function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-lavender-100 text-black",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    muted: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  );
}

export function timeAgo(iso, t) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return t("just_now");
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t("ago_minutes")}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${t("ago_hours")}`;
  return `${Math.floor(diff / 86400)} ${t("ago_days")}`;
}
