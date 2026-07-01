import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { api, formatApiError } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { getEcho, leaveProffiChat } from "../realtime";

const AVATAR_COLORS = ["bg-sky-500", "bg-emerald-500", "bg-rose-500", "bg-violet-500", "bg-amber-500", "bg-cyan-500"];

function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function messageTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function presenceText(chat, otherIsCustomer) {
  const raw = otherIsCustomer ? chat?.customer_last_seen : chat?.specialist_last_seen;
  if (chat?.other_is_online) return "в сети";
  if (chat?.other_last_seen_at) return lastSeenText(chat.other_last_seen_at);
  if (!raw) return "был недавно";
  return lastSeenText(raw);
}

function lastSeenText(raw) {
  const diff = Date.now() - new Date(raw).getTime();
  if (diff < 5 * 60 * 1000) return "в сети";
  if (diff < 60 * 60 * 1000) return `был ${Math.max(1, Math.floor(diff / 60000))} мин назад`;
  return "был недавно";
}

export default function ChatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);

  const loadMessages = async () => {
    try {
      const m = await api.get(`/chats/${id}/messages`);
      setMessages(m.data);
      setLastLoadedAt(new Date());
    } catch {
      /* keep current messages visible if a poll fails */
    }
  };

  useEffect(() => {
    let mounted = true;
    api.get(`/chats/${id}`).then((r) => mounted && setChat(r.data));
    loadMessages();
    const iv = setInterval(loadMessages, 2000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const echo = getEcho();
    if (!echo || !id) return undefined;

    const channel = echo.private(`proffi.chat.${id}`)
      .listen(".message.sent", (event) => {
        const next = event?.message;
        if (!next) return;
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(next.id))) return prev;
          return [...prev, next];
        });
        if (event?.chat) {
          setChat((prev) => prev ? { ...prev, ...event.chat } : prev);
        }
        if (String(next.sender_id) !== String(user?.id)) {
          api.post(`/chats/${id}/read`).catch(() => undefined);
        }
      })
      .listen(".messages.read", (event) => {
        if (String(event?.reader_id) === String(user?.id)) return;
        setMessages((prev) => prev.map((m) => String(m.sender_id) === String(user?.id) ? { ...m, read_at: event.read_at } : m));
      })
      .listen(".user.typing", (event) => {
        if (String(event?.user_id) === String(user?.id)) return;
        setTyping(Boolean(event?.is_typing));
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTyping(false), 5500);
      })
      .listen(".presence.updated", (event) => {
        if (String(event?.user_id) === String(user?.id)) return;
        setChat((prev) => prev ? { ...prev, other_is_online: Boolean(event?.is_online), other_last_seen_at: event?.last_seen_at } : prev);
      });

    api.post("/presence/heartbeat").catch(() => undefined);
    api.post(`/chats/${id}/read`).catch(() => undefined);

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      channel.stopListening(".message.sent");
      channel.stopListening(".messages.read");
      channel.stopListening(".user.typing");
      channel.stopListening(".presence.updated");
      leaveProffiChat(id);
    };
  }, [id, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const v = text.trim();
    setText("");
    try {
      const { data } = await api.post(`/chats/${id}/messages`, { text: v });
      setMessages((prev) => [...prev, data]);
    } catch (err) {
      toast.error(formatApiError(err));
      setText(v);
    } finally {
      setSending(false);
    }
  };

  const onTextChange = (value) => {
    setText(value);
    api.post(`/chats/${id}/typing`, { is_typing: value.trim().length > 0 }).catch(() => undefined);
  };

  const otherIsCustomer = chat ? user?.id !== chat.customer_id : false;
  const otherName = chat ? (user?.id === chat.customer_id ? chat.specialist_name : chat.customer_name) : "";
  const status = useMemo(() => (chat ? presenceText(chat, otherIsCustomer) : ""), [chat, otherIsCustomer]);

  return (
    <div className="flex flex-col h-full bg-white" data-testid="chat-detail-page">
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100">
        <div className="h-16 px-4 flex items-center gap-3">
          <button
            data-testid="top-back-btn"
            onClick={() => navigate("/chats")}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors shrink-0"
            title="Назад к чатам"
          >
            <Lucide.ArrowLeft size={22} />
          </button>

          <div className={`relative w-11 h-11 rounded-full ${avatarColor(otherName)} flex items-center justify-center font-extrabold text-white text-lg shrink-0`}>
            {otherName?.charAt(0)?.toUpperCase() || "?"}
            <span className="absolute right-0 bottom-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold truncate">{otherName || "Чат"}</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            </div>
            <p className="text-xs text-neutral-500 truncate">{status}{chat?.task_title ? ` · ${chat.task_title}` : ""}</p>
          </div>

          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors" title="Позвонить">
            <Lucide.Phone size={20} />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors" title="Ещё">
            <Lucide.MoreHorizontal size={22} />
          </button>
        </div>
      </header>

      <div className="scroll-area px-4 sm:px-7 py-5 flex flex-col gap-3 bg-white">
        {messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-sm text-center">
            <Lucide.MessageCircle size={46} className="mx-auto text-neutral-300 mb-3" strokeWidth={1.4} />
            <p className="text-sm text-neutral-500">{t("no_chats")}</p>
          </div>
        )}

        {messages.map((m, index) => {
          const mine = m.sender_id === user?.id;
          const previous = messages[index - 1];
          const compact = previous && previous.sender_id === m.sender_id;
          return (
            <div key={m.id} data-testid={`message-${m.id}`} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"} ${compact ? "mt-[-6px]" : ""}`}>
              {!mine && !compact && (
                <div className={`w-9 h-9 rounded-full ${avatarColor(otherName)} flex items-center justify-center font-extrabold text-white text-sm shrink-0 mt-1`}>
                  {otherName?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              {!mine && compact && <div className="w-9 shrink-0" />}

              <div className={`max-w-[78%] sm:max-w-[68%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div
                  className={`px-4 py-2.5 rounded-[20px] text-[15px] leading-snug shadow-sm ${
                    mine
                      ? "bg-sky-100 text-black rounded-br-md"
                      : "bg-neutral-100 text-black rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{m.text}</p>
                </div>
                <div className={`mt-1 flex items-center gap-1 text-[11px] text-neutral-400 ${mine ? "pr-1" : "pl-1"}`}>
                  {mine && <Lucide.CheckCheck size={13} className="text-sky-500" />}
                  <span>{messageTime(m.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="self-end text-xs text-neutral-400 pr-1">отправляем...</div>
        )}
        {typing && (
          <div className="ml-11 w-fit rounded-2xl bg-neutral-100 px-4 py-2 text-sm text-neutral-500">печатает...</div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="px-4 sm:px-6 py-3 border-t border-neutral-100 bg-white flex items-center gap-2">
        <button type="button" className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors shrink-0" title="Добавить">
          <Lucide.Plus size={24} />
        </button>
        <div className="min-w-0 flex-1 h-11 rounded-xl border-2 border-sky-300 bg-white px-3 flex items-center focus-within:border-sky-400 transition-colors">
          <input
            data-testid="chat-input"
            className="w-full bg-transparent outline-none text-[15px]"
            placeholder={t("type_message")}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
          />
        </div>
        <button type="button" className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors shrink-0" title="Фото">
          <Lucide.Camera size={22} />
        </button>
        <button
          data-testid="chat-send-btn"
          type="submit"
          disabled={!text.trim() || sending}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors shrink-0 ${
            text.trim() && !sending ? "bg-black text-white hover:bg-neutral-800" : "hover:bg-neutral-100 text-neutral-500"
          }`}
          title={text.trim() ? "Отправить" : "Голосовое сообщение"}
        >
          {text.trim() ? <Lucide.Send size={18} /> : <Lucide.Mic size={22} />}
        </button>
      </form>

      {lastLoadedAt && (
        <div className="sr-only" aria-live="polite">
          Сообщения обновлены {lastLoadedAt.toISOString()}
        </div>
      )}
    </div>
  );
}
