import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { BACKEND_URL } from "./api";

let echo = null;

function realtimeEnabled() {
  return Boolean(process.env.REACT_APP_PUSHER_KEY);
}

export function getEcho() {
  if (!realtimeEnabled()) return null;
  if (echo) return echo;

  const scheme = process.env.REACT_APP_PUSHER_SCHEME || "http";
  const port = Number(process.env.REACT_APP_PUSHER_PORT || (scheme === "https" ? 443 : 6001));

  window.Pusher = Pusher;
  echo = new Echo({
    broadcaster: "pusher",
    key: process.env.REACT_APP_PUSHER_KEY,
    cluster: "mt1",
    wsHost: process.env.REACT_APP_PUSHER_HOST || window.location.hostname,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === "https",
    encrypted: scheme === "https",
    enabledTransports: scheme === "https" ? ["wss"] : ["ws", "wss"],
    authEndpoint: `${BACKEND_URL}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    },
  });

  return echo;
}

export function leaveProffiChat(chatId) {
  const instance = getEcho();
  if (instance && chatId) instance.leave(`proffi.chat.${chatId}`);
}

export function resetEcho() {
  if (echo) echo.disconnect();
  echo = null;
}
