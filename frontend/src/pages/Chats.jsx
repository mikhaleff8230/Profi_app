import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Lucide from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { timeAgo, Empty, LangSwitcher } from "../components/Layout";

export default function Chats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/chats").then((r) => setChats(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="scroll-area bg-white" data-testid="chats-page">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between bg-white sticky top-0 z-20">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("chats")}</h1>
        <LangSwitcher />
      </div>
      <div className="px-5 pb-6">
        {loading && <p className="text-center py-8 text-neutral-400">{t("loading")}</p>}
        {!loading && chats.length === 0 && <Empty icon={Lucide.MessageCircle} text={t("no_chats")} />}
        <div className="flex flex-col divide-y divide-neutral-100">
          {chats.map((c) => {
            const other = user?.id === c.customer_id ? c.specialist_name : c.customer_name;
            return (
              <button
                key={c.id}
                data-testid={`chat-row-${c.id}`}
                className="flex items-center gap-3 py-3 text-left hover:bg-lavender-50 -mx-2 px-2 rounded-2xl transition-colors"
                onClick={() => navigate(`/chat/${c.id}`)}
              >
                <div className="w-12 h-12 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-lg">
                  {other.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold truncate">{other}</p>
                    {c.last_message_at && (
                      <span className="text-xs text-neutral-400">{timeAgo(c.last_message_at, t)}</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 truncate">{c.task_title}</p>
                  <p className="text-sm text-neutral-700 truncate mt-0.5">{c.last_message || ""}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
