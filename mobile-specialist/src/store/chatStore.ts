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
  markAsRead: (chatId: ChatId) => Promise<void>;
  sendTyping: (chatId: ChatId, isTyping: boolean) => Promise<void>;
  heartbeat: () => Promise<void>;
  receiveRealtimeMessage: (message: Message) => void;
  markRealtimeRead: (chatId: ChatId, readerId: ChatId, readAt: string, currentUserId?: ChatId | null) => void;
  updateChatRealtime: (chatId: ChatId, patch: Partial<Chat>) => void;
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

  markAsRead: async (chatId: ChatId) => {
    await chatService.markAsRead(chatId);
    const key = String(chatId);
    set((s) => ({
      chats: s.chats.map((c) => String(c.id) === key ? { ...c, unread_count: 0 } : c),
    }));
  },

  sendTyping: async (chatId: ChatId, isTyping: boolean) => {
    await chatService.sendTyping(chatId, isTyping);
  },

  heartbeat: async () => {
    await chatService.heartbeat();
  },

  receiveRealtimeMessage: (message: Message) => {
    const key = String(message.chat_id);
    set((s) => {
      const prev = s.messages[key] ?? [];
      const exists = prev.some((m) => String(m.id) === String(message.id));
      const messages = exists ? prev : [...prev, message];
      const chats = sortChats(
        s.chats.map((c) => String(c.id) === key
          ? { ...c, last_message: message.text, updated_at: message.created_at, is_typing: false }
          : c)
      );
      return { messages: { ...s.messages, [key]: messages }, chats };
    });
  },

  markRealtimeRead: (chatId: ChatId, readerId: ChatId, readAt: string, currentUserId?: ChatId | null) => {
    const key = String(chatId);
    set((s) => ({
      messages: {
        ...s.messages,
        [key]: (s.messages[key] ?? []).map((m) =>
          currentUserId != null && String(m.user_id) === String(currentUserId)
            ? { ...m, read_at: readAt }
            : m
        ),
      },
      chats: String(readerId) === String(currentUserId)
        ? s.chats.map((c) => String(c.id) === key ? { ...c, unread_count: 0 } : c)
        : s.chats,
    }));
  },

  updateChatRealtime: (chatId: ChatId, patch: Partial<Chat>) => {
    const key = String(chatId);
    set((s) => ({
      chats: s.chats.map((c) => String(c.id) === key ? { ...c, ...patch } : c),
    }));
  },
}));
