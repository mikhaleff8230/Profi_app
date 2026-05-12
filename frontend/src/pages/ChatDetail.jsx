import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { api, formatApiError } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { TopBar } from "../components/Layout";

export default function ChatDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadMessages = async () => {
    try {
      const m = await api.get(`/chats/${id}/messages`);
      setMessages(m.data);
    } catch {
      /* ignore polling errors */
    }
  };

  useEffect(() => {
    let mounted = true;
    api.get(`/chats/${id}`).then((r) => mounted && setChat(r.data));
    loadMessages();
    const iv = setInterval(loadMessages, 3000);
    return () => { mounted = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const v = text;
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

  const otherName = chat ? (user?.id === chat.customer_id ? chat.specialist_name : chat.customer_name) : "";

  return (
    <div className="flex flex-col h-full bg-white" data-testid="chat-detail-page">
      <TopBar
        title={otherName}
        right={chat ? (
          <span className="text-xs font-semibold text-neutral-400 truncate max-w-[80px]">{chat.task_title}</span>
        ) : null}
      />
      <div className="scroll-area px-4 py-4 flex flex-col gap-2 bg-lavender-50">
        {messages.length === 0 && (
          <p className="text-center text-sm text-neutral-400 mt-10">{t("no_chats")}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div
              key={m.id}
              data-testid={`message-${m.id}`}
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${mine ? "self-end bg-black text-white rounded-br-md" : "self-start bg-white text-black rounded-bl-md"}`}
            >
              <p className="whitespace-pre-line break-words">{m.text}</p>
              <p className={`text-[10px] mt-1 ${mine ? "text-neutral-300" : "text-neutral-400"}`}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="p-3 border-t border-neutral-100 bg-white flex items-center gap-2">
        <input
          data-testid="chat-input"
          className="flex-1 input-base !h-12"
          placeholder={t("type_message")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          data-testid="chat-send-btn"
          type="submit"
          disabled={!text.trim() || sending}
          className={`w-12 h-12 rounded-full flex items-center justify-center ${text.trim() && !sending ? "bg-black text-white hover:bg-neutral-800" : "bg-neutral-200 text-neutral-400"}`}
        >
          <Lucide.Send size={18} />
        </button>
      </form>
    </div>
  );
}
