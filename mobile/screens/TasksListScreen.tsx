import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { apiFetch, fileUrl } from "../src/api";
import { useAuth } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing } from "../src/theme";
import { SearchBar } from "../components/SearchBar";
import { TaskCardRow, type TaskItem } from "../components/TaskCardRow";
import { ScreenHeader } from "../components/ScreenHeader";
import { EmptyState } from "../components/EmptyState";
import type { CategoryTileData } from "../components/CategoryTile";
import type { RootStackParamList } from "../src/navigation/types";
import { buildTaskQueryParams } from "../src/utils/taskQuery";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "TasksList">;

type Story = { id: string | number; title_ru: string; color?: string | null };

export default function TasksListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { t } = useLang();
  const [category, setCategory] = useState(route.params?.category_id || route.params?.category || "");
  const [q, setQ] = useState(route.params?.q || "");
  const [city, setCity] = useState(route.params?.city || "");
  const [budgetMin, setBudgetMin] = useState(route.params?.budget_min || "");
  const [budgetMax, setBudgetMax] = useState(route.params?.budget_max || "");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setCategory(route.params?.category_id || route.params?.category || "");
    setQ(route.params?.q || "");
    setCity(route.params?.city || "");
    setBudgetMin(route.params?.budget_min || "");
    setBudgetMax(route.params?.budget_max || "");
  }, [route.params]);

  useEffect(() => {
    apiFetch("/stories", { method: "GET" })
      .then((d) => setStories(Array.isArray(d) ? d : []))
      .catch(() => setStories([]));
    apiFetch("/categories", { method: "GET" })
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]));
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const selectedCategory = categories.find((c) => String(c.id) === String(category));
    const qs = buildTaskQueryParams({
      category_id: selectedCategory ? String(selectedCategory.id) : category || undefined,
      q: q || undefined,
      city: city || undefined,
      budget_min: budgetMin || undefined,
      budget_max: budgetMax || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
      sort: coords ? "distance" : undefined,
      favorites: favoritesOnly ? "1" : undefined,
    });
    try {
      const data = await apiFetch(qs ? `/tasks?${qs}` : "/tasks", { method: "GET" });
      setTasks(Array.isArray(data) ? (data as TaskItem[]) : []);
    } catch (e: unknown) {
      setTasks([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [category, q, city, budgetMin, budgetMax, coords, categories, favoritesOnly]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({});
    setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  };

  const toggleFavorite = async (task: TaskItem) => {
    if (!user) return;
    try {
      if (task.is_favorite) {
        await apiFetch(`/favorites/${task.id}`, { method: "DELETE" });
      } else {
        await apiFetch(`/favorites/${task.id}`, { method: "POST" });
      }
      setTasks((prev) =>
        prev.map((row) => (String(row.id) === String(task.id) ? { ...row, is_favorite: !row.is_favorite } : row)),
      );
    } catch {
      /* no-op */
    }
  };

  const currentCat = categories.find((c) => String(c.id) === String(category));
  const scrollPadding = useScrollBottomPadding(32);

  const mapParams = {
    category: currentCat ? undefined : category || undefined,
    category_id: currentCat ? String(currentCat.id) : undefined,
    q,
    city,
    budget_min: budgetMin,
    budget_max: budgetMax,
  };

  return (
    <ScreenLayout>
      <ScreenHeader title={t("search_orders")} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.scroll, scrollPadding]} keyboardShouldPersistTaps="handled">
        <View style={styles.toggleRow}>
          <View style={styles.segment}>
            <View style={styles.segmentOn}>
              <Text style={styles.segmentOnText}>{t("list_view")}</Text>
            </View>
            <TouchableOpacity style={styles.segmentOff} onPress={() => navigation.navigate("Map", mapParams)}>
              <Text style={styles.segmentOffText}>{t("map_view")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchRow}>
          <SearchBar value={q} onChangeText={setQ} placeholder={t("search_orders")} onSubmit={loadTasks} />
          {user?.role === "specialist" ? (
            <TouchableOpacity
              style={[styles.iconBtn, favoritesOnly && styles.iconBtnActive]}
              onPress={() => setFavoritesOnly((v) => !v)}
            >
              <Ionicons name={favoritesOnly ? "heart" : "heart-outline"} size={22} color={colors.black} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.iconBtn} onPress={locate}>
            <Ionicons name="navigate-outline" size={22} color={colors.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.filters}>
          <TextInput
            style={styles.filterInput}
            placeholder={t("city")}
            placeholderTextColor={colors.neutral400}
            value={city}
            onChangeText={setCity}
            onSubmitEditing={loadTasks}
          />
          <TextInput
            style={styles.filterInput}
            placeholder={t("budget_min")}
            placeholderTextColor={colors.neutral400}
            keyboardType="number-pad"
            value={budgetMin}
            onChangeText={(v) => setBudgetMin(v.replace(/\D/g, ""))}
            onSubmitEditing={loadTasks}
          />
          <TextInput
            style={styles.filterInput}
            placeholder={t("budget_max")}
            placeholderTextColor={colors.neutral400}
            keyboardType="number-pad"
            value={budgetMax}
            onChangeText={(v) => setBudgetMax(v.replace(/\D/g, ""))}
            onSubmitEditing={loadTasks}
          />
        </View>

        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catStrip}>
            <TouchableOpacity
              style={[styles.catItem, !category && styles.catItemActive]}
              onPress={() => setCategory("")}
            >
              <View style={styles.catIconBox}>
                <Ionicons name="grid-outline" size={22} color={colors.black} />
              </View>
              <Text style={styles.catLabel}>Все</Text>
            </TouchableOpacity>
            {categories.map((cat) => {
              const active = String(cat.id) === String(category);
              const imageUri = cat.image ? fileUrl(cat.image) : null;
              return (
                <TouchableOpacity
                  key={String(cat.id)}
                  style={[styles.catItem, active && styles.catItemActive]}
                  onPress={() => setCategory(String(cat.id))}
                >
                  <View style={styles.catIconBox}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.catImage} resizeMode="cover" />
                    ) : (
                      <Ionicons name="briefcase-outline" size={22} color={colors.black} />
                    )}
                  </View>
                  <Text style={styles.catLabel} numberOfLines={2}>
                    {cat.name_ru}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {stories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stories}>
            {stories.map((s) => (
              <View key={String(s.id)} style={[styles.storyCard, { backgroundColor: s.color || colors.lavender200 }]}>
                <Text style={styles.storyTitle}>{s.title_ru}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {currentCat && (
          <Text style={styles.filterHint}>
            {t("category")}: {currentCat.name_ru}
          </Text>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.neutral400} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadTasks}>
              <Text style={styles.retryText}>{t("retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : tasks.length === 0 ? (
          <EmptyState text={t("no_tasks")} />
        ) : (
          <View style={styles.list}>
            {tasks.map((task) => (
              <TaskCardRow
                key={String(task.id)}
                task={task}
                category={categories.find(
                  (c) => String(c.id) === String(task.category_id || task.category)
                )}
                onPress={() => navigation.navigate("TaskDetail", { taskId: String(task.id) })}
                onToggleFavorite={user?.role === "specialist" ? () => toggleFavorite(task) : undefined}
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.lavender50,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: { backgroundColor: "#D9F36B" },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  filterInput: {
    flexGrow: 1,
    minWidth: 100,
    backgroundColor: colors.lavender50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  catStrip: { paddingHorizontal: spacing.xl, gap: 12, marginBottom: spacing.lg },
  catItem: { width: 72, alignItems: "center", gap: 6 },
  catItemActive: { opacity: 1 },
  catIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.lavender100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  catImage: { width: 56, height: 56 },
  catLabel: { fontSize: 11, fontWeight: "600", color: colors.black, textAlign: "center", lineHeight: 14 },
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
  errorBox: { paddingHorizontal: spacing.xl, paddingVertical: 24, alignItems: "center", gap: 8 },
  errorText: { color: colors.neutral600, textAlign: "center" },
  retryText: { fontWeight: "700", color: colors.black },
});
