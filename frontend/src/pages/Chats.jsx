import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Lucide from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { timeAgo, Empty } from "../components/Layout";
import { getEcho, leaveProffiChat } from "../realtime";

const AVATAR_COLORS = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-lime-500",
];

function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getUnreadCount(chat) {
  return Number(chat.unread_count || chat.unreadCount || chat.unread || 0);
}

function statusLabel(status) {
  const labels = {
    open: "Открыт",
    in_progress: "В работе",
    completed: "Завершён",
    archived: "Архив",
  };
  return labels[status] || "Заказ";
}

export default function Chats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const load = async (status = tab) => {
    setLoading(true);
    try {
      const { data } = await api.get(status && status !== "all" ? `/chats?status=${status}` : "/chats");
      setChats(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab);
    const iv = setInterval(() => load(tab), 5000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    const echo = getEcho();
    if (!echo || chats.length === 0) return undefined;

    const ids = chats.map((c) => String(c.id));
    ids.forEach((chatId) => {
      echo.private(`proffi.chat.${chatId}`)
        .listen(".message.sent", (event) => {
          setChats((prev) => sortChats(prev.map((chat) => {
            if (String(chat.id) !== String(event?.chat_id)) return chat;
            const mine = String(event?.message?.sender_id) === String(user?.id);
            return {
              ...chat,
              last_message: event?.message?.text ?? event?.chat?.last_message ?? chat.last_message,
              last_message_at: event?.message?.created_at ?? event?.chat?.last_message_at ?? chat.last_message_at,
              unread_count: mine ? getUnreadCount(chat) : getUnreadCount(chat) + 1,
              is_typing: false,
            };
          })));
        })
        .listen(".messages.read", (event) => {
          if (String(event?.reader_id) !== String(user?.id)) return;
          setChats((prev) => prev.map((chat) => String(chat.id) === String(event?.chat_id) ? { ...chat, unread_count: 0 } : chat));
        })
        .listen(".user.typing", (event) => {
          if (String(event?.user_id) === String(user?.id)) return;
          setChats((prev) => prev.map((chat) => String(chat.id) === String(event?.chat_id) ? { ...chat, is_typing: Boolean(event?.is_typing) } : chat));
        })
        .listen(".presence.updated", (event) => {
          if (String(event?.user_id) === String(user?.id)) return;
          setChats((prev) => prev.map((chat) => String(chat.id) === String(event?.chat_id) ? {
            ...chat,
            other_is_online: Boolean(event?.is_online),
            other_last_seen_at: event?.last_seen_at,
          } : chat));
        });
    });

    api.post("/presence/heartbeat").catch(() => undefined);
    return () => ids.forEach(leaveProffiChat);
  }, [chats, user?.id]);

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => {
      const otherName = user?.id === c.customer_id ? c.specialist_name : c.customer_name;
      return [otherName, c.task_title, c.last_message].filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [chats, query, user?.id]);

  const tabs = [
    { id: "all", label: "Все" },
    { id: "in_progress", label: "В работе" },
    { id: "completed", label: "Готовые" },
    { id: "archived", label: "Архив" },
  ];

  const totalUnread = chats.reduce((sum, c) => sum + getUnreadCount(c), 0);

  return (
    <div className="scroll-area bg-white" data-testid="chats-page">
      <div className="sticky top-0 z-20 bg-white px-5 pt-6 pb-4 border-b border-neutral-100">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-[32px] leading-none font-extrabold tracking-tight">Сообщения</h1>
            <p className="mt-2 text-sm text-neutral-500">Отдельный список диалогов, как в маркетплейсах</p>
          </div>
          <button
            className="relative w-11 h-11 rounded-full flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 transition-colors"
            data-testid="chats-readall-btn"
            title="Отметить прочитанным"
          >
            <Lucide.CheckCheck size={20} className="text-neutral-700" />
            {totalUnread > 0 && <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">{totalUnread}</span>}
          </button>
        </div>

        <label className="h-11 rounded-xl bg-neutral-100 px-4 flex items-center gap-2 focus-within:ring-2 focus-within:ring-sky-400 transition-all">
          <Lucide.Search size={18} className="text-neutral-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по сообщениям"
            className="w-full bg-transparent outline-none text-sm"
            data-testid="chat-search-input"
          />
        </label>

        <div className="mt-3 flex gap-2 overflow-x-auto" data-testid="chat-tabs">
          {tabs.map((tt) => (
            <button
              key={tt.id}
              data-testid={`chat-tab-${tt.id}`}
              onClick={() => setTab(tt.id)}
              className={`shrink-0 h-9 px-4 rounded-xl text-sm font-semibold transition-colors ${
                tab === tt.id ? "bg-black text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {tt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-6">
        {loading && <p className="text-center py-8 text-neutral-400">{t("loading")}</p>}
        {!loading && filteredChats.length === 0 && <Empty icon={Lucide.MessageCircle} text={t("no_chats")} />}
        <div className="flex flex-col py-3">
          {filteredChats.map((c) => {
            const otherName = user?.id === c.customer_id ? c.specialist_name : c.customer_name;
            const unreadCount = getUnreadCount(c);
            const hasUnread = unreadCount > 0;
            const preview = c.is_typing ? "печатает..." : (c.last_message || "Диалог создан. Напишите первое сообщение.");
            return (
              <button
                key={c.id}
                data-testid={`chat-row-${c.id}`}
                className={`group grid grid-cols-[44px_1fr_auto] gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
                  hasUnread ? "bg-sky-50 hover:bg-sky-100" : "hover:bg-neutral-50"
                }`}
                onClick={() => navigate(`/chat/${c.id}`)}
              >
                <div className="relative">
                  <div className={`w-11 h-11 rounded-full ${avatarColor(otherName)} flex items-center justify-center font-extrabold text-white text-lg shrink-0`}>
                    {otherName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <span className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold truncate">{otherName}</p>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  </div>
                  <p className="text-sm text-black truncate">{c.task_title}</p>
                  <p className={`text-sm truncate ${c.is_typing ? "text-sky-600 font-semibold" : hasUnread ? "text-black font-semibold" : "text-neutral-500"}`}>{preview}</p>
                </div>

                <div className="flex flex-col items-end gap-2 pt-0.5 min-w-[70px]">
                  <span className="text-xs text-neutral-500">{c.last_message_at ? timeAgo(c.last_message_at, t) : timeAgo(c.created_at, t)}</span>
                  {hasUnread ? (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  ) : (
                    <Lucide.CheckCheck size={16} className="text-sky-500" />
                  )}
                  <span className="text-[11px] text-neutral-400">{statusLabel(c.task_status)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function sortChats(chats) {
  return [...chats].sort((a, b) => new Date(b.last_message_at || b.updated_at || b.created_at || 0).getTime() - new Date(a.last_message_at || a.updated_at || a.created_at || 0).getTime());
}
