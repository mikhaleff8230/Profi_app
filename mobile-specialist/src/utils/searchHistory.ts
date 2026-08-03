import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "treabo_search_history";
const MAX_ITEMS = 20;

export async function getSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function addSearchHistory(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return getSearchHistory();
  const prev = await getSearchHistory();
  const next = [trimmed, ...prev.filter((x) => x.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function removeSearchHistoryItem(query: string): Promise<string[]> {
  const prev = await getSearchHistory();
  const next = prev.filter((x) => x !== query);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
