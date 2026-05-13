import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/api";
import { useAuth } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { timeAgo } from "../src/utils/timeAgo";
import { colors, spacing, typography } from "../src/theme";
import { EmptyState } from "../components/EmptyState";

type ChatRow = {
  id: number | string;
  customer_id: number | string;
  specialist_name?: string;
  customer_name?: string;
  task_title?: string;
  last_message?: string | null;
  last_message_at?: string | null;
  created_at?: string | null;
};

const AVATAR_BG = ["#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffffff;
  return AVATAR_BG[h % AVATAR_BG.length];
}

export default function ChatsScreen() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [tab, setTab] = useState<"open" | "in_progress" | "completed" | "archived">("open");
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = tab === "archived" ? "?status=archived" : tab === "open" ? "?status=open" : `?status=${tab}`;
      const data = await apiFetch(`/chats${q}`, { method: "GET" });
      setChats(Array.isArray(data) ? data : []);
    } catch {
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "open", label: t("tab_open") },
    { id: "in_progress", label: t("tab_in_progress") },
    { id: "completed", label: t("tab_completed") },
    { id: "archived", label: t("tab_archived") },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{t("chats")}</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="checkmark-done-outline" size={22} color={colors.neutral500} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {tabs.map((tt) => (
          <TouchableOpacity key={tt.id} style={styles.tab} onPress={() => setTab(tt.id)}>
            <Text style={[styles.tabLabel, tab === tt.id && styles.tabLabelOn]}>{tt.label}</Text>
            {tab === tt.id ? <View style={styles.tabUnderline} /> : <View style={styles.tabSpacer} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.body}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.neutral400} />
        ) : chats.length === 0 ? (
          <EmptyState text={t("no_chats")} />
        ) : (
          chats.map((c) => {
            const otherName =
              user?.id != null && String(user.id) === String(c.customer_id) ? c.specialist_name : c.customer_name;
            const name = otherName || "?";
            const isCustomerMe = user?.id != null && String(user.id) === String(c.customer_id);
            const when = c.last_message_at || c.created_at;
            return (
              <TouchableOpacity
                key={String(c.id)}
                style={styles.row}
                onPress={() => Alert.alert(t("soon"), t("chat_soon"))}
                activeOpacity={0.85}
              >
                <View style={[styles.avatar, { backgroundColor: avatarColor(name) }]}>
                  <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.time}>{when ? timeAgo(when, lang) : ""}</Text>
                  </View>
                  {c.task_title ? (
                    <Text style={styles.taskTitle} numberOfLines={1}>
                      {c.task_title}
                    </Text>
                  ) : null}
                  {c.last_message ? (
                    <Text style={styles.preview} numberOfLines={1}>
                      {c.last_message}
                    </Text>
                  ) : null}
                  {!isCustomerMe ? (
                    <Text style={styles.hint}>{t("client_saw_response")}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  title: { ...typography.title, fontSize: 22 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    gap: 20,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  tab: { paddingBottom: 8 },
  tabLabel: { fontSize: 16, fontWeight: "700", color: colors.neutral400 },
  tabLabelOn: { color: colors.black },
  tabUnderline: { height: 2, backgroundColor: colors.black, marginTop: 8, borderRadius: 1 },
  tabSpacer: { height: 2, marginTop: 8 },
  body: { paddingHorizontal: spacing.xl, paddingBottom: 32 },
  loader: { marginTop: 32 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 18, fontWeight: "800", color: colors.white },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 2 },
  name: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.black },
  time: { fontSize: 12, color: colors.neutral400 },
  taskTitle: { fontSize: 14, color: colors.neutral700 },
  preview: { fontSize: 14, color: colors.neutral400, marginTop: 2 },
  hint: { fontSize: 12, fontWeight: "600", color: colors.emerald, marginTop: 4 },
});
