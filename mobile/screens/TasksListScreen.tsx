import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenLayout, useScrollBottomPadding } from "../components/ScreenLayout";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/api";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";

import { SearchBar } from "../components/SearchBar";
import { TaskCardRow, type TaskItem } from "../components/TaskCardRow";
import { ScreenHeader } from "../components/ScreenHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState } from "../components/EmptyState";
import type { CategoryTileData } from "../components/CategoryTile";
import type { RootStackParamList } from "../src/navigation/types";
import { MOCK_STORIES } from "../src/mocks/demoData";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "TasksList">;

export default function TasksListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { t, lang } = useLang();
  const [category, setCategory] = useState(route.params?.category || "");
  const [q, setQ] = useState(route.params?.q || "");
  const [city] = useState(route.params?.city || "");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stories, setStories] = useState<typeof MOCK_STORIES>([]);
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setCategory(route.params?.category || "");
    setQ(route.params?.q || "");
  }, [route.params?.category, route.params?.q]);

  useEffect(() => {
    apiFetch("/stories", { method: "GET" })
      .then((d) => (Array.isArray(d) && d.length ? d : MOCK_STORIES))
      .catch(() => MOCK_STORIES)
      .then(setStories);
    apiFetch("/categories", { method: "GET" })
      .then((d) => (Array.isArray(d) ? d : []))
      .catch(() => [])
      .then(setCategories);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (coords) {
      params.set("lat", String(coords.lat));
      params.set("lng", String(coords.lng));
      params.set("sort", "distance");
    }
    const qs = params.toString();
    try {
      const data = await apiFetch(qs ? `/tasks?${qs}` : "/tasks", { method: "GET" });
      setTasks(Array.isArray(data) ? (data as TaskItem[]) : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [category, q, city, coords]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({});
    setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  };

  const currentCat = categories.find((c) => String(c.id) === String(category));

  const onSearchSubmit = () => loadTasks();
  const scrollPadding = useScrollBottomPadding(32);

  return (
    <ScreenLayout>
      <ScreenHeader title={t("search_orders")} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.scroll, scrollPadding]} keyboardShouldPersistTaps="handled">
        <View style={styles.toggleRow}>
          <View style={styles.segment}>
            <View style={styles.segmentOn}>
              <Text style={styles.segmentOnText}>{t("list_view")}</Text>
            </View>
            <TouchableOpacity
              style={styles.segmentOff}
              onPress={() => navigation.navigate("Map", { category, q, city })}
            >
              <Text style={styles.segmentOffText}>{t("map_view")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchRow}>
          <SearchBar value={q} onChangeText={setQ} placeholder={t("search_orders")} onSubmit={onSearchSubmit} />
          <TouchableOpacity style={styles.iconBtn} onPress={locate}>
            <Ionicons name="navigate-outline" size={22} color={colors.black} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stories}>
          {stories.map((s) => (
            <View key={s.id} style={[styles.storyCard, { backgroundColor: s.color || colors.lavender200 }]}>
              <Text style={styles.storyTitle}>{s.title_ru}</Text>
            </View>
          ))}
        </ScrollView>

        {currentCat && (
          <Text style={styles.filterHint}>
            {t("category")}: {currentCat.name_ru}
          </Text>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.neutral400} />
        ) : tasks.length === 0 ? (
          <EmptyState text={t("no_tasks")} />
        ) : (
          <View style={styles.list}>
            {tasks.map((task) => (
              <TaskCardRow
                key={String(task.id)}
                task={task}
                category={categories.find((c) => String(c.id) === String(task.category))}
                onPress={() => navigation.navigate("TaskDetail", { taskId: String(task.id) })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {},
  toggleRow: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.lavender100,
    borderRadius: radii.full,
    padding: 4,
    alignSelf: "flex-start",
  },
  segmentOn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.white,
  },
  segmentOnText: { fontSize: 14, fontWeight: "700", color: colors.black },
  segmentOff: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: radii.full },
  segmentOffText: { fontSize: 14, fontWeight: "700", color: colors.neutral500 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.lavender50,
    alignItems: "center",
    justifyContent: "center",
  },
  stories: { paddingHorizontal: spacing.xl, gap: 10, marginBottom: spacing.lg },
  storyCard: {
    width: 120,
    height: 140,
    borderRadius: 24,
    padding: 12,
    justifyContent: "flex-end",
  },
  storyTitle: { fontSize: 14, fontWeight: "800", color: colors.white, lineHeight: 18 },
  filterHint: { paddingHorizontal: spacing.xl, marginBottom: 8, fontSize: 13, color: colors.neutral500 },
  list: { paddingHorizontal: spacing.xl, gap: 12 },
  loader: { marginTop: 24 },
});
