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
  created_at: string;
};

type ApiMessage = {
  id: ChatId;
  chat_id: ChatId;
  sender_id?: string | number;
  user_id?: string | number;
  text: string;
  type?: string;
  created_at: string;
};

function mapChat(chat: ApiChat): Chat {
  return {
    id: chat.id,
    title: chat.task_title || chat.specialist_name || chat.customer_name || "Чат",
    last_message: chat.last_message ?? null,
    updated_at: chat.last_message_at || chat.created_at,
  };
}

function mapMessage(message: ApiMessage): Message {
  return {
    id: message.id,
    chat_id: message.chat_id,
    user_id: message.sender_id ?? message.user_id ?? 0,
    text: message.text,
    type: message.type === "image" || message.type === "pin" ? message.type : "text",
    created_at: message.created_at,
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
      body: JSON.stringify({ text: payload.text ?? "" }),
    });
    return mapMessage(data);
  }
}

export const chatApiService: IChatService = new ApiChatService();
