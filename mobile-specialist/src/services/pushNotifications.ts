import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Alert, Linking, Platform } from "react-native";
import { apiFetch } from "../api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let currentToken: string | null = null;

export async function registerPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Сообщения",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      sound: "default",
    });
  }

  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return null;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await apiFetch("/auth/push-tokens", {
    method: "POST",
    body: JSON.stringify({ token, platform: Platform.OS, device_id: Device.modelId || Device.modelName || null }),
  });
  currentToken = token;
  return token;
}

export async function unregisterPushNotifications(): Promise<void> {
  if (!currentToken) return;
  try {
    await apiFetch("/auth/push-tokens", { method: "DELETE", body: JSON.stringify({ token: currentToken }) });
  } finally {
    currentToken = null;
  }
}

export function subscribeToNotificationLinks() {
  const handled = new Set<string>();
  const handleResponse = (response: Notifications.NotificationResponse) => {
    const responseId = response.notification.request.identifier;
    if (handled.has(responseId)) return;
    handled.add(responseId);
    const data = response.notification.request.content.data;
    const requestId = data?.request_id;
    if (data?.type === "login_confirmation" && typeof requestId === "string") {
      Alert.alert("Вход мастера", "Подтвердить вход в Treabo на другом устройстве?", [
        { text: "Отклонить", style: "cancel", onPress: () => void apiFetch(`/auth/push-login/${requestId}/reject`, { method: "POST" }) },
        { text: "Подтвердить", onPress: () => void apiFetch(`/auth/push-login/${requestId}/approve`, { method: "POST" }) },
      ]);
      return;
    }
    const url = data?.url;
    if (typeof url === "string") void Linking.openURL(url);
  };
  void Notifications.getLastNotificationResponseAsync().then((response) => response && handleResponse(response));
  return Notifications.addNotificationResponseReceivedListener(handleResponse);
}
