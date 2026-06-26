import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { TabScreenLayout } from "../../components/TabScreenLayout";
import { useLang } from "../context/LangContext";
import type { Lang } from "../i18n";
import { useChatStore } from "../store/chatStore";
import type { Chat } from "../types/chat";
import { colors, spacing, typography } from "../theme";
import { timeAgo } from "../utils/timeAgo";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Chats">,
  NativeStackNavigationProp<RootStackParamList>
>;

const AVATAR_BG = ["#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];

function avatarColor(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) & 0xfffffff;
  return AVATAR_BG[h % AVATAR_BG.length];
}

function ChatRow({
  chat,
  lang,
  onPress,
}: {
  chat: Chat;
  lang: Lang;
  onPress: () => void;
}) {
  const letter = chat.title.charAt(0).toUpperCase();
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.avatar, { backgroundColor: avatarColor(chat.title) }]}>
        <Text style={styles.avatarLetter}>{letter}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {chat.title}
          </Text>
          <Text style={styles.time}>{timeAgo(chat.updated_at, lang)}</Text>
        </View>
        <Text style={styles.preview} numberOfLines={2}>
          {chat.last_message || "-"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.neutral300} />
    </TouchableOpacity>
  );
}

export default function ChatListScreen() {
  const navigation = useNavigation<Nav>();
  const { t, lang } = useLang();
  const chats = useChatStore((s) => s.chats);
  const loadingChats = useChatStore((s) => s.loadingChats);
  const loadChats = useChatStore((s) => s.loadChats);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [loadChats])
  );

  return (
    <TabScreenLayout>
      <View style={styles.header}>
        <Text style={styles.title}>{t("chats")}</Text>
      </View>

      {loadingChats && chats.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={colors.neutral400} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ChatRow
              chat={item}
              lang={lang}
              onPress={() => navigation.navigate("ChatDetail", { chatId: String(item.id) })}
            />
          )}
          contentContainerStyle={chats.length === 0 ? styles.emptyList : styles.list}
          refreshControl={<RefreshControl refreshing={loadingChats} onRefresh={loadChats} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.neutral300} />
              <Text style={styles.emptyTitle}>{t("no_chats")}</Text>
              <Text style={styles.emptyHint}>Сообщения появятся после отклика и принятия заказа</Text>
            </View>
          }
        />
      )}
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.title, fontSize: 22 },
  list: { paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 80 },
  loader: { marginTop: 48 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral100,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 20, fontWeight: "800", color: colors.white },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  name: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.black },
  time: { fontSize: 12, color: colors.neutral400 },
  preview: { fontSize: 14, color: colors.neutral500, lineHeight: 19 },
  emptyWrap: { alignItems: "center", paddingHorizontal: spacing.xxl, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.neutral600, marginTop: 8 },
  emptyHint: { fontSize: 13, color: colors.neutral400, textAlign: "center" },
});
