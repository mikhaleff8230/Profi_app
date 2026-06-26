import { chatApiService } from "./chatApiService";
import type { Chat, ChatId, Message, SendMessagePayload } from "../types/chat";

export interface IChatService {
  getChats(): Promise<Chat[]>;
  getChat(chatId: ChatId): Promise<Chat | null>;
  getMessages(chatId: ChatId): Promise<Message[]>;
  sendMessage(chatId: ChatId, payload: SendMessagePayload): Promise<Message>;
}

export const chatService: IChatService = chatApiService;
