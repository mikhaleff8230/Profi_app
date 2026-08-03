import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardStickyView,
} from "../components/KeyboardViews";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CHAT_INPUT_BASE_HEIGHT, ChatInput } from "../components/ChatInput";
import { MessageBubble } from "../components/MessageBubble";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { useChatStore } from "../store/chatStore";
import { LOCAL_USER_ID, type Message } from "../types/chat";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import { fileUrl } from "../api";
import { Ionicons } from "@expo/vector-icons";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "ChatDetail">;

const HEADER_BODY_HEIGHT = 82;
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
  const specialistAvatar = fileUrl(chat?.specialist_avatar);
  const specialistName = chat?.specialist_name || "Мастер";
  const list = messages ?? [];

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
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

      const privateChannel = typeof echo.private === "function" ? echo.private(`proffi.chat.${chatId}`) : null;
      if (!privateChannel || typeof privateChannel.listen !== "function") return;
      channel = privateChannel;
      channel.listen(".message.sent", (event: any) => {
          if (!event?.message) return;
          receiveRealtimeMessage(event.message);
          if (String(event.message.sender_id) !== String(user?.id)) {
            markAsRead(chatId).catch(() => undefined);
          }
        });
      channel.listen(".messages.read", (event: any) => {
          if (!event?.read_at) return;
          markRealtimeRead(chatId, event.reader_id, event.read_at, user?.id);
        });
      channel.listen(".user.typing", (event: any) => {
          if (String(event?.user_id) === String(user?.id)) return;
          updateChatRealtime(chatId, { is_typing: Boolean(event?.is_typing) });
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => updateChatRealtime(chatId, { is_typing: false }), 5500);
        });
      channel.listen(".presence.updated", (event: any) => {
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
      if (channel && typeof channel.stopListening === "function") {
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
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setTimeout(() => scrollToEnd(false), 0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollToEnd]);

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
      setTimeout(() => scrollToEnd(true), 0);
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
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={23} color={colors.black} /></TouchableOpacity>
        <TouchableOpacity style={styles.specialistHead} disabled={!chat?.specialist_id} onPress={() => chat?.specialist_id && navigation.navigate("SpecialistProfile", { specialistId: String(chat.specialist_id), chatId: String(chatId) })} activeOpacity={0.75}>
          {specialistAvatar ? <Image source={{ uri: specialistAvatar }} style={styles.headerAvatar} /> : <View style={[styles.headerAvatar, styles.headerFallback]}><Text style={styles.headerLetter}>{specialistName.charAt(0).toUpperCase()}</Text></View>}
          <View style={styles.headerTexts}><Text style={styles.specialistName} numberOfLines={1}>{specialistName}</Text><Text style={styles.taskTitle} numberOfLines={2}>{chat?.task_title || chat?.title || t("chats")}</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerMore} disabled={!chat?.specialist_id} onPress={() => chat?.specialist_id && navigation.navigate("SpecialistProfile", { specialistId: String(chat.specialist_id), chatId: String(chatId) })}><Ionicons name="ellipsis-horizontal" size={22} color={colors.black} /></TouchableOpacity>
      </View>
      {chat?.is_typing ? <Text style={styles.typing}>печатает...</Text> : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? keyboardVerticalOffset : 0}
      >
        <ImageBackground
          source={require("../../assets/chat-wallpaper.png")}
          style={styles.wallpaper}
          imageStyle={styles.wallpaperImage}
          resizeMode="cover"
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
        </ImageBackground>

        <KeyboardStickyView offset={{ closed: insets.bottom, opened: 0 }}>
          <ChatInput
            value={text}
            onChangeText={onChangeText}
            onSend={onSend}
            placeholder={t("type_message")}
            sending={sending}
            keyboardVisible={keyboardVisible}
          />
        </KeyboardStickyView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  chatHeader: { minHeight: HEADER_BODY_HEIGHT, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral100 },
  headerBack: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, specialistHead: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 48, height: 48, borderRadius: 24 }, headerFallback: { backgroundColor: "#D9F36B", alignItems: "center", justifyContent: "center" }, headerLetter: { fontSize: 20, fontWeight: "900", color: colors.black },
  headerTexts: { flex: 1, minWidth: 0 }, specialistName: { fontSize: 15, fontWeight: "900", color: colors.black }, taskTitle: { marginTop: 2, fontSize: 12, lineHeight: 16, color: colors.neutral500 }, headerMore: { width: 38, height: 42, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.white },
  wallpaper: { flex: 1, backgroundColor: colors.lavender50 },
  wallpaperImage: { opacity: 0.72 },
  list: { flex: 1, backgroundColor: "transparent" },
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
