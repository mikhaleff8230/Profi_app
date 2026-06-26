export type MessageType = "text" | "image" | "pin";
export type ChatId = string | number;
export type UserId = string | number;

export type Chat = {
  id: ChatId;
  title: string;
  last_message: string | null;
  updated_at: string;
};

export type Message = {
  id: ChatId;
  chat_id: ChatId;
  user_id: UserId;
  text: string;
  type: MessageType;
  created_at: string;
};

export type SendMessagePayload = {
  text?: string;
  type?: MessageType;
};

/** Текущий пользователь в локальной БД (позже — id с Laravel API). */
export const LOCAL_USER_ID = 1;
