import { apiFetch } from "../api";
import type { IChatService } from "./chatService";
import type { Chat, ChatId, Message, SendMessagePayload } from "../types/chat";

type ApiChat = {
  id: ChatId;
  task_title?: string;
  customer_name?: string;
  specialist_name?: string;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  is_typing?: boolean;
  other_is_online?: boolean;
  other_last_seen_at?: string | null;
  created_at: string;
  updated_at?: string;
};

type ApiMessage = {
  id: ChatId;
  chat_id: ChatId;
  sender_id?: string | number;
  user_id?: string | number;
  text: string;
  type?: string;
  metadata?: Record<string, any> | null;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
};

function mapChat(chat: ApiChat): Chat {
  return {
    id: chat.id,
    title: chat.task_title || chat.specialist_name || chat.customer_name || "Чат",
    last_message: chat.last_message ?? null,
    updated_at: chat.last_message_at || chat.updated_at || chat.created_at,
    unread_count: Number(chat.unread_count || 0),
    is_typing: Boolean(chat.is_typing),
    other_is_online: Boolean(chat.other_is_online),
    other_last_seen_at: chat.other_last_seen_at ?? null,
  };
}

function mapMessage(message: ApiMessage): Message {
  return {
    id: message.id,
    chat_id: message.chat_id,
    user_id: message.sender_id ?? message.user_id ?? 0,
    text: message.text,
    type: message.type === "image" || message.type === "file" || message.type === "pin" ? message.type : "text",
    metadata: message.metadata ?? null,
    created_at: message.created_at,
    delivered_at: message.delivered_at ?? null,
    read_at: message.read_at ?? null,
  };
}

export class ApiChatService implements IChatService {
  async getChats(): Promise<Chat[]> {
    const data = await apiFetch("/chats", { method: "GET" });
    return Array.isArray(data) ? data.map(mapChat) : [];
  }

  async getChat(chatId: ChatId): Promise<Chat | null> {
    const data = await apiFetch(`/chats/${chatId}`, { method: "GET" });
    return data ? mapChat(data) : null;
  }

  async getMessages(chatId: ChatId): Promise<Message[]> {
    const data = await apiFetch(`/chats/${chatId}/messages`, { method: "GET" });
    return Array.isArray(data) ? data.map(mapMessage) : [];
  }

  async sendMessage(chatId: ChatId, payload: SendMessagePayload): Promise<Message> {
    const data = await apiFetch(`/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text: payload.text ?? "", type: payload.type, metadata: payload.metadata }),
    });
    return mapMessage(data);
  }

  async markAsRead(chatId: ChatId): Promise<void> {
    await apiFetch(`/chats/${chatId}/read`, { method: "POST" });
  }

  async sendTyping(chatId: ChatId, isTyping: boolean): Promise<void> {
    await apiFetch(`/chats/${chatId}/typing`, {
      method: "POST",
      body: JSON.stringify({ is_typing: isTyping }),
    });
  }

  async heartbeat(): Promise<void> {
    await apiFetch("/presence/heartbeat", { method: "POST" });
  }
}

export const chatApiService: IChatService = new ApiChatService();
