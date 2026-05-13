import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/api";
import { useAuth } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import { ScreenHeader } from "../components/ScreenHeader";
import type { RootStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "ChatDetail">;

type Msg = { id: string; sender_id: string; text: string; created_at: string };

export default function ChatDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { chatId } = route.params;
  const { user } = useAuth();
  const { t } = useLang();
  const [chat, setChat] = useState<{ task_title?: string; customer_id?: string; specialist_name?: string; customer_name?: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [demo, setDemo] = useState(false);
  const listRef = useRef<FlatList>(null);

  const loadChat = useCallback(async () => {
    try {
      const c = await apiFetch(`/chats/${chatId}`, { method: "GET" });
      setChat(c);
      setDemo(false);
    } catch {
      setChat({ task_title: t("demo_chat_task"), customer_id: "x", specialist_name: "Demo", customer_name: "Demo" });
      setDemo(true);
    }
  }, [chatId, t]);

  const loadMessages = useCallback(async () => {
    try {
      const m = await apiFetch(`/chats/${chatId}/messages`, { method: "GET" });
      setMessages(Array.isArray(m) && m.length ? m : []);
      setDemo(false);
    } catch {
      const uid = String(user?.id ?? "local-me");
      setMessages([
        {
          id: "demo-1",
          sender_id: "demo-peer",
          text: "Здравствуйте! Готов приступить завтра. (демо)",
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "demo-2",
          sender_id: uid,
          text: "Отлично, жду в 10:00.",
          created_at: new Date(Date.now() - 1800000).toISOString(),
        },
      ]);
      setDemo(true);
    }
  }, [chatId, user?.id]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  useEffect(() => {
    loadMessages();
    const iv = setInterval(loadMessages, 4000);
    return () => clearInterval(iv);
  }, [loadMessages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    const v = text.trim();
    setText("");
    setSending(true);
    try {
      if (demo) {
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            sender_id: String(user?.id ?? "me"),
            text: v,
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }
      const data = await apiFetch(`/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: v }),
      });
      setMessages((prev) => [...prev, data]);
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
      setText(v);
    } finally {
      setSending(false);
    }
  };

  const otherName =
    chat && user?.id != null
      ? String(user.id) === String(chat.customer_id)
        ? chat.specialist_name
        : chat.customer_name
      : "";

  const renderItem = ({ item }: { item: Msg }) => {
    const mine = String(item.sender_id) === String(user?.id);
    return (
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
        <Text style={[styles.time, mine && styles.timeMine]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    );
  };

  if (!chat) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScreenHeader
        title={otherName || "…"}
        onBack={() => navigation.goBack()}
        right={<Text style={styles.headerSub} numberOfLines={1}>{chat.task_title}</Text>}
      />
      {demo && (
        <View style={styles.demoBar}>
          <Text style={styles.demoTxt}>{t("demo_data_banner")}</Text>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={styles.empty}>{t("no_messages")}</Text>}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t("type_message")}
            placeholderTextColor={colors.neutral400}
            value={text}
            onChangeText={setText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendDisabled]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="send" size={18} color={text.trim() ? colors.white : colors.neutral400} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerSub: { maxWidth: 100, fontSize: 11, fontWeight: "600", color: colors.neutral400 },
  demoBar: { backgroundColor: colors.lavender100, paddingVertical: 6 },
  demoTxt: { textAlign: "center", fontSize: 11, color: colors.neutral600 },
  list: { padding: 16, paddingBottom: 8, backgroundColor: colors.lavender50, flexGrow: 1 },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginBottom: 8 },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: colors.black, borderBottomRightRadius: 6 },
  bubbleOther: { alignSelf: "flex-start", backgroundColor: colors.white, borderBottomLeftRadius: 6 },
  bubbleText: { fontSize: 15, color: colors.black, lineHeight: 20 },
  bubbleTextMine: { color: colors.white },
  time: { fontSize: 10, marginTop: 4, color: colors.neutral400 },
  timeMine: { color: colors.neutral300 },
  empty: { textAlign: "center", color: colors.neutral400, marginTop: 32 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.neutral100, backgroundColor: colors.white },
  input: {
    flex: 1,
    backgroundColor: colors.lavender50,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 15,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { backgroundColor: colors.neutral100 },
});
