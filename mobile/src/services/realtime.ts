import Echo from "laravel-echo";
import Pusher from "pusher-js/react-native";
import { API_BASE, getToken } from "../api";

let echo: Echo<any> | null = null;

function getRealtimeConfig() {
  const scheme = process.env.EXPO_PUBLIC_PUSHER_SCHEME || "https";
  const port = Number(process.env.EXPO_PUBLIC_PUSHER_PORT || (scheme === "https" ? 443 : 6001));
  const host = process.env.EXPO_PUBLIC_PUSHER_HOST || API_BASE.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const key = process.env.EXPO_PUBLIC_PUSHER_KEY || "";
  return { scheme, port, host, key };
}

export async function getEcho(): Promise<Echo<any> | null> {
  const { scheme, port, host, key } = getRealtimeConfig();
  if (!key) return null;
  if (echo) return echo;

  const token = await getToken();
  echo = new Echo({
    broadcaster: "pusher",
    client: new Pusher(key, {
      cluster: "mt1",
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS: scheme === "https",
      enabledTransports: scheme === "https" ? ["wss"] : ["ws", "wss"],
      authEndpoint: `${API_BASE}/api/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      },
    }),
  });

  return echo;
}

export async function leaveProffiChat(chatId: string | number): Promise<void> {
  const instance = await getEcho();
  instance?.leave(`proffi.chat.${chatId}`);
}

export function resetEcho(): void {
  echo?.disconnect();
  echo = null;
}
