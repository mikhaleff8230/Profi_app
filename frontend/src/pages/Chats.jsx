import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Lucide from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { timeAgo, Empty } from "../components/Layout";

const AVATAR_COLORS = ["bg-amber-500", "bg-emerald-500", "bg-red-500", "bg-blue-500", "bg-violet-500", "bg-pink-500", "bg-cyan-500"];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function Chats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("open");

  const load = (status) => {
    setLoading(true);
    api
      .get(status ? `/chats?status=${status}` : "/chats")
      .then((r) => setChats(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(tab === "archived" ? "archived" : tab);
  }, [tab]);

  const tabs = [
    { id: "open", label: t("tab_open") },
    { id: "in_progress", label: t("tab_in_progress") },
    { id: "completed", label: t("tab_completed") },
    { id: "archived", label: t("tab_archived") },
  ];

  return (
    <div className="scroll-area bg-white" data-testid="chats-page">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 bg-white sticky top-0 z-20 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("chats")}</h1>
        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-lavender-50" data-testid="chats-readall-btn">
          <Lucide.CheckCheck size={20} className="text-neutral-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-5 pb-3 flex gap-5 overflow-x-auto border-b border-neutral-100 sticky top-[68px] bg-white z-10" data-testid="chat-tabs">
        {tabs.map((tt) => (
          <button
            key={tt.id}
            data-testid={`chat-tab-${tt.id}`}
            onClick={() => setTab(tt.id)}
            className={`shrink-0 text-base font-bold pb-2 transition-colors ${tab === tt.id ? "text-black border-b-2 border-black" : "text-neutral-400"}`}
          >{tt.label}</button>
        ))}
      </div>

      <div className="px-5 pb-6">
        {loading && <p className="text-center py-8 text-neutral-400">{t("loading")}</p>}
        {!loading && chats.length === 0 && <Empty icon={Lucide.MessageCircle} text={t("no_chats")} />}
        <div className="flex flex-col divide-y divide-neutral-100">
          {chats.map((c) => {
            const otherName = user?.id === c.customer_id ? c.specialist_name : c.customer_name;
            const isCustomerMe = user?.id === c.customer_id;
            return (
              <button
                key={c.id}
                data-testid={`chat-row-${c.id}`}
                className="flex items-center gap-3 py-3 text-left hover:bg-lavender-50 -mx-2 px-2 rounded-2xl transition-colors"
                onClick={() => navigate(`/chat/${c.id}`)}
              >
                <div className={`w-12 h-12 rounded-full ${avatarColor(otherName)} flex items-center justify-center font-bold text-white text-lg shrink-0`}>
                  {otherName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="font-bold truncate">{otherName}</p>
                    <div className="flex items-center gap-1 text-xs text-neutral-400 shrink-0">
                      {c.last_message_at && <Lucide.CheckCheck size={14} className="text-neutral-500" />}
                      <span>{c.last_message_at ? timeAgo(c.last_message_at, t) : timeAgo(c.created_at, t)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-700 truncate">{c.task_title}</p>
                  {c.last_message && (
                    <p className="text-sm text-neutral-400 truncate">{c.last_message}</p>
                  )}
                  {!isCustomerMe && (
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">{t("client_saw_response")}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
