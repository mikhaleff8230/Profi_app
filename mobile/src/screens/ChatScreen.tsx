import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardStickyView,
} from "../components/KeyboardViews";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenHeader } from "../../components/ScreenHeader";
import { CHAT_INPUT_BASE_HEIGHT, ChatInput } from "../components/ChatInput";
import { MessageBubble } from "../components/MessageBubble";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { useChatStore } from "../store/chatStore";
import { LOCAL_USER_ID, type Message } from "../types/chat";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "ChatDetail">;

const HEADER_BODY_HEIGHT = 52;
const COMPOSER_MIN_HEIGHT = CHAT_INPUT_BASE_HEIGHT + spacing.md * 3;

export default function ChatScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const chatId = route.params.chatId;
  const { t } = useLang();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const chats = useChatStore((s) => s.chats);
  const messages = useChatStore((s) => s.messages[String(chatId)]);
  const loadingMessages = useChatStore((s) => s.loadingMessages[String(chatId)]);
  const loadChats = useChatStore((s) => s.loadChats);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const markAsRead = useChatStore((s) => s.markAsRead);
  const sendTyping = useChatStore((s) => s.sendTyping);
  const heartbeat = useChatStore((s) => s.heartbeat);
  const receiveRealtimeMessage = useChatStore((s) => s.receiveRealtimeMessage);
  const markRealtimeRead = useChatStore((s) => s.markRealtimeRead);
  const updateChatRealtime = useChatStore((s) => s.updateChatRealtime);

  const chat = chats.find((c) => String(c.id) === String(chatId));
  const list = messages ?? [];

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keyboardVerticalOffset = Math.max(insets.top, 12) + HEADER_BODY_HEIGHT;

  useEffect(() => {
    if (!String(chatId).trim()) {
      navigation.goBack();
      return;
    }
    loadChats();
    loadMessages(chatId);
    heartbeat().catch(() => undefined);
    markAsRead(chatId).catch(() => undefined);
  }, [chatId, heartbeat, loadChats, loadMessages, markAsRead, navigation]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadMessages(chatId).then(() => markAsRead(chatId)).catch(() => undefined);
    }, 8000);
    return () => clearInterval(timer);
  }, [chatId, loadMessages, markAsRead]);

  useEffect(() => {
    let alive = true;
    let channel: any = null;

    (async () => {
      const { getEcho, leaveProffiChat } = await import("../services/realtime");
      const echo = await getEcho();
      if (!alive || !echo) return;

      channel = echo.private(`proffi.chat.${chatId}`)
        .listen(".message.sent", (event: any) => {
          if (!event?.message) return;
          receiveRealtimeMessage(event.message);
          if (String(event.message.sender_id) !== String(user?.id)) {
            markAsRead(chatId).catch(() => undefined);
          }
        })
        .listen(".messages.read", (event: any) => {
          if (!event?.read_at) return;
          markRealtimeRead(chatId, event.reader_id, event.read_at, user?.id);
        })
        .listen(".user.typing", (event: any) => {
          if (String(event?.user_id) === String(user?.id)) return;
          updateChatRealtime(chatId, { is_typing: Boolean(event?.is_typing) });
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => updateChatRealtime(chatId, { is_typing: false }), 5500);
        })
        .listen(".presence.updated", (event: any) => {
          if (String(event?.user_id) === String(user?.id)) return;
          updateChatRealtime(chatId, {
            other_is_online: Boolean(event?.is_online),
            other_last_seen_at: event?.last_seen_at ?? null,
          });
        });

      return () => leaveProffiChat(chatId);
    })();

    return () => {
      alive = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (channel) {
        channel.stopListening(".message.sent");
        channel.stopListening(".messages.read");
        channel.stopListening(".user.typing");
        channel.stopListening(".presence.updated");
      }
      import("../services/realtime").then(({ leaveProffiChat }) => leaveProffiChat(chatId)).catch(() => undefined);
    };
  }, [chatId, markAsRead, markRealtimeRead, receiveRealtimeMessage, updateChatRealtime, user?.id]);

  const scrollToEnd = useCallback((animated = true) => {
    if (list.length > 0) {
      listRef.current?.scrollToEnd({ animated });
    }
  }, [list.length]);

  useEffect(() => {
    scrollToEnd(false);
  }, [list.length, scrollToEnd]);

  const onSend = async () => {
    const v = text.trim();
    if (!v || sending) return;
    setText("");
    setSending(true);
    try {
      await sendMessage(chatId, v);
      requestAnimationFrame(() => scrollToEnd(true));
    } catch (e) {
      setText(v);
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const onChangeText = (value: string) => {
    setText(value);
    sendTyping(chatId, value.trim().length > 0).catch(() => undefined);
  };

  const renderItem = useCallback(({ item }: { item: Message }) => {
    const isMine = user?.id != null ? String(item.user_id) === String(user.id) : item.user_id === LOCAL_USER_ID;
    return <MessageBubble message={item} isMine={isMine} />;
  }, [user?.id]);

  if (!String(chatId).trim()) {
    return null;
  }

  if (loadingMessages && list.length === 0) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "bottom", "left", "right"]}>
        <ActivityIndicator size="large" color={colors.black} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScreenHeader title={chat?.title ?? t("chats")} onBack={() => navigation.goBack()} />
      {chat?.is_typing ? <Text style={styles.typing}>печатает...</Text> : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <FlatList
          ref={listRef}
          style={styles.list}
          data={list}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => scrollToEnd(false)}
          ListEmptyComponent={<Text style={styles.empty}>{t("no_messages")}</Text>}
        />

        <KeyboardStickyView offset={{ closed: insets.bottom, opened: 0 }}>
          <ChatInput
            value={text}
            onChangeText={onChangeText}
            onSend={onSend}
            placeholder={t("type_message")}
            sending={sending}
          />
        </KeyboardStickyView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.white },
  list: { flex: 1, backgroundColor: colors.lavender50 },
  typing: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
    color: colors.neutral500,
    fontSize: 13,
    backgroundColor: colors.white,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: COMPOSER_MIN_HEIGHT,
  },
  empty: { textAlign: "center", color: colors.neutral400, marginTop: 40, fontSize: 15 },
});
