import { create } from "zustand";
import { chatService } from "../services/chatService";
import type { Chat, ChatId, Message } from "../types/chat";

type ChatState = {
  chats: Chat[];
  messages: Record<string, Message[]>;
  loadingChats: boolean;
  loadingMessages: Record<string, boolean>;
  error: string | null;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: ChatId) => Promise<void>;
  sendMessage: (chatId: ChatId, text: string) => Promise<void>;
};

function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  messages: {},
  loadingChats: false,
  loadingMessages: {},
  error: null,

  loadChats: async () => {
    set({ loadingChats: true, error: null });
    try {
      const chats = await chatService.getChats();
      set({ chats: sortChats(chats), loadingChats: false });
    } catch (e) {
      set({
        loadingChats: false,
        error: e instanceof Error ? e.message : "Failed to load chats",
      });
    }
  },

  loadMessages: async (chatId: ChatId) => {
    const key = String(chatId);
    set((s) => ({
      loadingMessages: { ...s.loadingMessages, [key]: true },
      error: null,
    }));
    try {
      const list = await chatService.getMessages(chatId);
      set((s) => ({
        messages: { ...s.messages, [key]: list },
        loadingMessages: { ...s.loadingMessages, [key]: false },
      }));
    } catch (e) {
      set((s) => ({
        loadingMessages: { ...s.loadingMessages, [key]: false },
        error: e instanceof Error ? e.message : "Failed to load messages",
      }));
    }
  },

  sendMessage: async (chatId: ChatId, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const key = String(chatId);

    try {
      const message = await chatService.sendMessage(chatId, { text: trimmed, type: "text" });
      set((s) => {
        const prev = s.messages[key] ?? [];
        const chats = sortChats(
          s.chats.map((c) =>
            String(c.id) === key
              ? { ...c, last_message: message.text, updated_at: message.created_at }
              : c
          )
        );
        return {
          messages: { ...s.messages, [key]: [...prev, message] },
          chats,
          error: null,
        };
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to send message" });
      throw e;
    }
  },
}));
