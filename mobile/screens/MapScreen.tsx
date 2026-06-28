import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { TaskCardRow, type TaskItem } from "../components/TaskCardRow";
import type { CategoryTileData } from "../components/CategoryTile";
import { apiFetch, fileUrl } from "../src/api";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import {
  buildMapCenterScript,
  buildMapUpdateScript,
  buildYandexMapShellHtml,
  toYandexPoints,
  yandexMapsApiKey,
} from "../src/maps/yandexMapHtml";
import type { RootStackParamList } from "../src/navigation/types";
import { filterTasksByBounds, parseMapBounds, type MapBounds } from "../src/utils/mapBounds";
import { buildTaskQueryParams, type TaskFilters } from "../src/utils/taskQuery";

type R = RouteProp<RootStackParamList, "Map">;
type TaskWithGeo = TaskItem & { lat?: number | null; lng?: number | null };

export default function MapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Map">>();
  const route = useRoute<R>();
  const filter = route.params || {};
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const listRef = useRef<FlatList<TaskWithGeo>>(null);
  const [tasks, setTasks] = useState<TaskWithGeo[]>([]);
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webviewReady, setWebviewReady] = useState(false);
  const apiKey = yandexMapsApiKey();
  const shellHtml = useMemo(() => (apiKey ? buildYandexMapShellHtml(apiKey) : ""), [apiKey]);

  const taskFilters = useMemo<TaskFilters>(
    () => ({
      category: filter.category,
      category_id: filter.category_id,
      q: filter.q,
      city: filter.city,
      budget_min: filter.budget_min,
      budget_max: filter.budget_max,
      lat: coords?.lat,
      lng: coords?.lng,
      sort: coords ? "distance" : undefined,
    }),
    [filter, coords]
  );

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildTaskQueryParams(taskFilters);
      const [catData, taskData] = await Promise.all([
        apiFetch("/categories", { method: "GET" }),
        apiFetch(qs ? `/tasks?${qs}` : "/tasks", { method: "GET" }),
      ]);
      setCategories(Array.isArray(catData) ? catData : []);
      setTasks(Array.isArray(taskData) ? (taskData as TaskWithGeo[]) : []);
      setSelectedId(null);
    } catch (e: unknown) {
      setTasks([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [taskFilters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const mapPoints = useMemo(() => toYandexPoints(tasks, (path) => fileUrl(path)), [tasks]);
  const visibleTasks = useMemo(() => filterTasksByBounds(tasks, bounds), [tasks, bounds]);
  const selectedIndex = useMemo(
    () => (selectedId ? visibleTasks.findIndex((task) => String(task.id) === selectedId) : -1),
    [visibleTasks, selectedId]
  );

  useEffect(() => {
    if (!webviewReady || !webRef.current) return;
    webRef.current.injectJavaScript(buildMapUpdateScript(mapPoints, selectedId));
  }, [mapPoints, selectedId, webviewReady]);

  useEffect(() => {
    if (selectedIndex >= 0) {
      listRef.current?.scrollToIndex({ index: selectedIndex, animated: true, viewPosition: 0.5 });
    }
  }, [selectedIndex]);

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("", t("geo_denied"));
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const next = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    setCoords(next);
    if (webRef.current) {
      webRef.current.injectJavaScript(buildMapCenterScript(next.lat, next.lng, 12));
    }
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "ready") setWebviewReady(true);
      if (message.type === "boundschange") {
        const next = parseMapBounds(message.payload || {});
        if (next) setBounds(next);
      }
      if (message.type === "select" && message.payload?.id != null) {
        setSelectedId(String(message.payload.id));
      }
    } catch {
      /* ignore */
    }
  };

  const navFilters = {
    category: filter.category,
    category_id: filter.category_id,
    q: filter.q,
    city: filter.city,
    budget_min: filter.budget_min,
    budget_max: filter.budget_max,
  };

  return (
    <View style={styles.root}>
      <View style={styles.mapPane}>
        {apiKey ? (
          <WebView
            ref={webRef}
            originWhitelist={["*"]}
            source={{ html: shellHtml }}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={styles.missingKey}>
            <Ionicons name="map-outline" size={42} color={colors.neutral500} />
            <Text style={styles.missingTitle}>{t("map_title")}</Text>
            <Text style={styles.missingText}>{t("map_key_missing")}</Text>
          </View>
        )}

        <SafeAreaView style={styles.overlay} edges={["top"]} pointerEvents="box-none">
          <View style={styles.toggleRow}>
            <View style={styles.segment}>
              <TouchableOpacity style={styles.segmentBtn} onPress={() => navigation.navigate("TasksList", navFilters)}>
                <Text style={styles.segmentInactive}>{t("list_view")}</Text>
              </TouchableOpacity>
              <View style={styles.segmentActive}>
                <Text style={styles.segmentActiveText}>{t("map_view")}</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>

        <TouchableOpacity style={[styles.locateBtn, { top: 72 + insets.top }]} onPress={locate}>
          <Ionicons name="navigate" size={22} color={colors.black} />
        </TouchableOpacity>

        {(loading || (apiKey && !webviewReady)) && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.black} />
          </View>
        )}
      </View>

      <View style={[styles.listPane, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.listHead}>
          <Ionicons name="list-outline" size={18} color={colors.black} />
          <Text style={styles.listHeadTitle}>{t("tasks_in_view")}</Text>
          <Text style={styles.listHeadCount}>
            {visibleTasks.length}
            {mapPoints.length ? ` / ${mapPoints.length}` : ""}
          </Text>
        </View>

        {error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadTasks}>
              <Text style={styles.retryText}>{t("retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : visibleTasks.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {mapPoints.length ? t("no_tasks_in_bounds") : t("no_tasks_with_coords")}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={visibleTasks}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={selectedId === String(item.id) ? styles.cardSelected : undefined}>
                <TaskCardRow
                  task={item}
                  category={categories.find(
                    (c) => String(c.id) === String(item.category_id || item.category)
                  )}
                  onPress={() => navigation.navigate("TaskDetail", { taskId: String(item.id) })}
                />
              </View>
            )}
            contentContainerStyle={styles.listContent}
            onScrollToIndexFailed={() => undefined}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  mapPane: { flex: 0.58, backgroundColor: colors.lavender50 },
  listPane: {
    flex: 0.42,
    backgroundColor: colors.lavender50,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 },
  toggleRow: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  segment: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: colors.lavender100,
    borderRadius: radii.full,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radii.full },
  segmentInactive: { fontSize: 14, fontWeight: "700", color: colors.neutral500 },
  segmentActive: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    elevation: 2,
  },
  segmentActiveText: { fontSize: 14, fontWeight: "700", color: colors.black },
  locateBtn: {
    position: "absolute",
    right: spacing.xl,
    zIndex: 3,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    zIndex: 1,
  },
  missingKey: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  missingTitle: { ...typography.headline },
  missingText: { ...typography.small, color: colors.neutral500, textAlign: "center" },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.xl,
    paddingTop: 14,
    paddingBottom: 8,
  },
  listHeadTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  listHeadCount: { fontSize: 13, color: colors.neutral500, fontWeight: "600" },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 12, gap: 10 },
  cardSelected: { borderRadius: 24, borderWidth: 2, borderColor: "#D9F36B" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { ...typography.body, color: colors.neutral500, textAlign: "center" },
  errorText: { ...typography.body, color: colors.neutral600, textAlign: "center", marginBottom: 8 },
  retryText: { color: colors.black, fontWeight: "700" },
});
