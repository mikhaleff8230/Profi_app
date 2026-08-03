import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TabScreenLayout } from "../components/TabScreenLayout";
import { TaskCardRow, type TaskItem } from "../components/TaskCardRow";
import type { CategoryTileData } from "../components/CategoryTile";
import { apiFetch } from "../src/api";
import { colors, spacing } from "../src/theme";
import type { MainTabParamList, RootStackParamList } from "../src/navigation/types";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

const TELEGRAM_URL = "https://t.me/+IKp5Qdq27MU3NGIy";

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, ts] = await Promise.all([
        apiFetch("/categories", { method: "GET" }),
        apiFetch("/tasks", { method: "GET" }),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setTasks(Array.isArray(ts) ? ts : []);
    } catch {
      setCategories([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <TabScreenLayout>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.segment}>
          <View style={styles.segmentOn}>
            <Text style={styles.segmentOnText}>Список</Text>
          </View>
          <TouchableOpacity style={styles.segmentOff} onPress={() => navigation.navigate("Map")}>
            <Text style={styles.segmentOffText}>Карта</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.telegramBanner} onPress={() => void Linking.openURL(TELEGRAM_URL)} activeOpacity={0.9}>
          <View style={styles.telegramIcon}>
            <Ionicons name="paper-plane" size={20} color={colors.white} />
          </View>
          <View style={styles.telegramText}>
            <Text style={styles.telegramTitle}>Telegram-группа мастеров</Text>
            <Text style={styles.telegramSub}>Новости, советы и общение по заказам Treabo</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral400} />
        </TouchableOpacity>

        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.searchFake} onPress={() => navigation.navigate("TaskSearch")}>
            <Ionicons name="search-outline" size={20} color={colors.neutral500} />
            <Text style={styles.searchText}>Какой заказ ищете?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => navigation.navigate("TaskFilter")}>
            <Ionicons name="options-outline" size={22} color={colors.black} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.neutral400} />
        ) : tasks.length === 0 ? (
          <Text style={styles.empty}>Пока нет подходящих заказов</Text>
        ) : (
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <TaskCardRow
                key={String(task.id)}
                task={task}
                category={categories.find((c) => String(c.id) === String(task.category_id || task.category))}
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
  scroll: { flex: 1, backgroundColor: colors.lavender50 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 96 },
  segment: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: colors.lavender100,
    borderRadius: 14,
    padding: 3,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  segmentOn: { backgroundColor: colors.white, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 8 },
  segmentOff: { borderRadius: 11, paddingHorizontal: 18, paddingVertical: 8 },
  segmentOnText: { fontSize: 13, fontWeight: "700", color: colors.black },
  segmentOffText: { fontSize: 13, fontWeight: "700", color: colors.neutral500 },
  telegramBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral100,
  },
  telegramIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#229ED9",
    alignItems: "center",
    justifyContent: "center",
  },
  telegramText: { flex: 1 },
  telegramTitle: { fontSize: 15, fontWeight: "800", color: colors.black },
  telegramSub: { fontSize: 12, color: colors.neutral500, marginTop: 2, lineHeight: 17 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: spacing.md },
  searchFake: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  searchText: { fontSize: 14, color: colors.neutral500 },
  filterBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  taskList: { gap: 12 },
  loader: { marginVertical: 24 },
  empty: { textAlign: "center", color: colors.neutral400, paddingVertical: 24, fontSize: 14 },
});
