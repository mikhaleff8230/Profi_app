import * as SQLite from "expo-sqlite";
import { LOCAL_USER_ID } from "../types/chat";

const DB_NAME = "proffi_chat.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  await getDatabase();
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      last_message TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      created_at TEXT NOT NULL,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
  `);
  await seedIfEmpty(db);
  return db;
}

async function seedIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM chats");
  if ((row?.count ?? 0) > 0) return;

  const now = new Date().toISOString();
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const dayAgo = new Date(Date.now() - 86400000).toISOString();

  await db.runAsync(
    `INSERT INTO chats (title, last_message, updated_at) VALUES (?, ?, ?)`,
    ["Иван Петров", "Готов приступить завтра", now]
  );
  await db.runAsync(
    `INSERT INTO chats (title, last_message, updated_at) VALUES (?, ?, ?)`,
    ["Мария — ремонт кухни", "Спасибо, до встречи!", hourAgo]
  );
  await db.runAsync(
    `INSERT INTO chats (title, last_message, updated_at) VALUES (?, ?, ?)`,
    ["Алексей, электрика", "Когда удобно созвониться?", dayAgo]
  );

  const seedMessages: { chatId: number; userId: number; text: string; type: string; at: string }[] = [
    { chatId: 1, userId: 2, text: "Здравствуйте! Вижу ваш заказ по натяжному потолку.", type: "text", at: dayAgo },
    { chatId: 1, userId: LOCAL_USER_ID, text: "Добрый день! Когда можете приехать на замер?", type: "text", at: hourAgo },
    { chatId: 1, userId: 2, text: "Готов приступить завтра", type: "text", at: now },
    { chatId: 2, userId: 3, text: "Добрый день, отправил смету в чат.", type: "text", at: dayAgo },
    { chatId: 2, userId: LOCAL_USER_ID, text: "Принял, спасибо!", type: "text", at: hourAgo },
    { chatId: 2, userId: 3, text: "Спасибо, до встречи!", type: "text", at: hourAgo },
    { chatId: 3, userId: 4, text: "Когда удобно созвониться?", type: "text", at: dayAgo },
  ];

  for (const m of seedMessages) {
    await db.runAsync(
      `INSERT INTO messages (chat_id, user_id, text, type, created_at) VALUES (?, ?, ?, ?, ?)`,
      [m.chatId, m.userId, m.text, m.type, m.at]
    );
  }
}
