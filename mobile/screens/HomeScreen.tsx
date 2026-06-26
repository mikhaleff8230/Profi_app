import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { colors, spacing, typography } from "../src/theme";
import { CategoryTile, type CategoryTileData } from "../components/CategoryTile";

import { PrimaryButton } from "../components/PrimaryButton";
import { SearchBar } from "../components/SearchBar";
import { TaskCardRow, type TaskItem } from "../components/TaskCardRow";
import type { MainTabParamList, RootStackParamList } from "../src/navigation/types";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { t } = useLang();
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, ts] = await Promise.all([apiFetch("/categories", { method: "GET" }), apiFetch("/tasks", { method: "GET" })]);
      setCategories(Array.isArray(cats) ? cats : []);
      setTasks(Array.isArray(ts) ? ts.slice(0, 8) : []);
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

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((x) => (x.title + (x.description || "")).toLowerCase().includes(q));
  }, [tasks, search]);

  const roleLabel = user?.role === "customer" ? t("customer") : t("specialist");
  const title =
    user?.role === "customer" ? t("home_title_customer") : t("home_title_specialist");

  return (
    <TabScreenLayout>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.roleCaps}>{roleLabel}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => navigation.navigate("Map")}
              accessibilityLabel={t("map_view")}
            >
            <Ionicons name="map-outline" size={22} color={colors.black} />
            </TouchableOpacity>
          </View>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder={t("search_placeholder")} />

        {user?.role === "customer" && (
          <PrimaryButton
            title={t("create_task")}
            onPress={() => navigation.navigate("CreateTask")}
            style={styles.createBtn}
          />
        )}

        <Text style={styles.sectionTitle}>{t("categories")}</Text>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.neutral400} />
        ) : (
          <View style={styles.catGrid}>
            {categories.map((c) => (
              <View key={c.id} style={styles.catCell}>
                <CategoryTile cat={c} onPress={() => navigation.navigate("TasksList", { category: String(c.id) })} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t("open_tasks")}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("TasksList", { q: search.trim() || undefined })}>
            <Text style={styles.viewAll}>
              {t("view_all")} →
            </Text>
          </TouchableOpacity>
        </View>

        {filteredTasks.length === 0 && !loading ? (
          <Text style={styles.empty}>{t("no_tasks")}</Text>
        ) : (
          <View style={styles.taskList}>
            {filteredTasks.map((task) => {
              const cat = categories.find((x) => String(x.id) === String(task.category));
              return (
                <TaskCardRow
                  key={String(task.id)}
                  task={task}
                  category={cat}
                  onPress={() => navigation.navigate("TaskDetail", { taskId: String(task.id) })}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: { flex: 1, paddingRight: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  mapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lavender50,
    alignItems: "center",
    justifyContent: "center",
  },
  roleCaps: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.neutral400,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: { ...typography.title, fontSize: 22 },
  createBtn: { marginTop: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { ...typography.headline, fontSize: 16, marginBottom: spacing.md },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  viewAll: { fontSize: 12, fontWeight: "600", color: colors.neutral500 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  catCell: { width: "25%", padding: 4 },
  taskList: { gap: 12 },
  loader: { marginVertical: 24 },
  empty: { textAlign: "center", color: colors.neutral400, paddingVertical: 24, fontSize: 14 },
});
