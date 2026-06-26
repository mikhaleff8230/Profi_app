import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TabScreenLayout } from "../components/TabScreenLayout";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/api";
import { useAuth } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { timeAgo } from "../src/utils/timeAgo";
import { colors, radii, spacing, typography } from "../src/theme";

import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState } from "../components/EmptyState";
import { TaskCardRow, type TaskItem } from "../components/TaskCardRow";
import { Badge } from "../components/Badge";
import { CardLight } from "../components/CardLight";
import type { MainTabParamList, RootStackParamList } from "../src/navigation/types";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Orders">,
  NativeStackNavigationProp<RootStackParamList>
>;

type ApplicationRow = {
  id: string;
  task_id: string;
  task_title: string;
  message: string;
  price?: number | null;
  status: string;
  created_at: string;
};

export default function OrdersScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [items, setItems] = useState<(TaskItem | ApplicationRow)[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const isSpec = user.role === "specialist";
    try {
      const url = isSpec ? "/applications/mine" : "/tasks/mine";
      const data = await apiFetch(url, { method: "GET" });
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  if (user.role === "specialist") {
    return (
      <TabScreenLayout>
        <View style={styles.header}>
          <Text style={styles.title}>{t("my_applications")}</Text>
        </View>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("TasksList", {})}>
          <Text style={styles.linkText}>{t("search_orders")} →</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral500} />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scroll}>
          {loading ? (
            <ActivityIndicator style={styles.loader} color={colors.neutral400} />
          ) : items.length === 0 ? (
            <EmptyState text={t("no_applications")} />
          ) : (
            (items as ApplicationRow[]).map((a) => (
              <TouchableOpacity key={a.id} activeOpacity={0.9} onPress={() => navigation.navigate("TaskDetail", { taskId: String(a.task_id) })}>
                <CardLight style={styles.card}>
                  <View style={styles.rowTop}>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {a.task_title}
                    </Text>
                    <Badge
                      variant={a.status === "accepted" ? "success" : a.status === "rejected" ? "muted" : "default"}
                    >
                      {t(a.status) || a.status}
                    </Badge>
                  </View>
                  <Text style={styles.msg} numberOfLines={3}>
                    {a.message}
                  </Text>
                  <View style={styles.meta}>
                    <Text style={styles.time}>{timeAgo(a.created_at, lang)}</Text>
                    {a.price != null && a.price > 0 && (
                      <Text style={styles.price}>
                        {a.price} {t("rub")}
                      </Text>
                    )}
                  </View>
                </CardLight>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </TabScreenLayout>
    );
  }

  return (
    <TabScreenLayout>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("my_tasks")}</Text>
        </View>
        <PrimaryButton title={t("create_task")} onPress={() => navigation.navigate("CreateTask")} style={styles.create} />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.neutral400} />
        ) : items.length === 0 ? (
          <EmptyState text={t("no_tasks")} />
        ) : (
          <View style={styles.list}>
            {(items as TaskItem[]).map((task) => (
              <TaskCardRow
                key={String(task.id)}
                task={task}
                onPress={() => navigation.navigate("TaskDetail", { taskId: String(task.id) })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  title: { ...typography.title, fontSize: 22 },
  create: { marginBottom: spacing.lg },
  list: { gap: 12 },
  loader: { marginTop: 32 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    marginBottom: 8,
  },
  linkText: { fontSize: 14, fontWeight: "600", color: colors.neutral600 },
  card: { marginBottom: 12 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  taskTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  msg: { fontSize: 14, color: colors.neutral600, marginBottom: 8 },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: 12, color: colors.neutral400 },
  price: { fontSize: 14, fontWeight: "800" },
});
