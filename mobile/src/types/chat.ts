export type MessageType = "text" | "image" | "file" | "pin";
export type ChatId = string | number;
export type UserId = string | number;

export type Chat = {
  id: ChatId;
  title: string;
  last_message: string | null;
  updated_at: string;
  unread_count?: number;
  is_typing?: boolean;
  other_is_online?: boolean;
  other_last_seen_at?: string | null;
};

export type Message = {
  id: ChatId;
  chat_id: ChatId;
  user_id: UserId;
  text: string;
  type: MessageType;
  metadata?: Record<string, any> | null;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
};

export type SendMessagePayload = {
  text?: string;
  type?: MessageType;
  metadata?: Record<string, any> | null;
};

/** Текущий пользователь в локальной БД (позже — id с Laravel API). */
export const LOCAL_USER_ID = 1;
