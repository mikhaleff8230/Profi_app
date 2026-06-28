import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TaskCardRow, type TaskItem } from "../components/TaskCardRow";
import type { CategoryTileData } from "../components/CategoryTile";
import { apiFetch, fileUrl } from "../src/api";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import { MOSCOW_CENTER, toYandexPoints, yandexMapsApiKey } from "../src/maps/yandexMapHtml";
import type { RootStackParamList } from "../src/navigation/types";
import { filterTasksByBounds, parseMapBounds, type MapBounds } from "../src/utils/mapBounds";
import { buildTaskQueryParams, type TaskFilters } from "../src/utils/taskQuery";

declare global {
  interface Window {
    ymaps?: any;
    __proffiYandexMapsPromise?: Promise<any>;
  }
}

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

type R = RouteProp<RootStackParamList, "Map">;
type TaskWithGeo = TaskItem & { lat?: number | null; lng?: number | null };

function loadYandexMaps(apiKey: string): Promise<any> {
  if (window.ymaps) {
    return new Promise((resolve) => window.ymaps!.ready(() => resolve(window.ymaps)));
  }
  if (window.__proffiYandexMapsPromise) return window.__proffiYandexMapsPromise;
  window.__proffiYandexMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => window.ymaps!.ready(() => resolve(window.ymaps));
    script.onerror = () => reject(new Error("Не удалось загрузить Яндекс.Карты"));
    document.head.appendChild(script);
  });
  return window.__proffiYandexMapsPromise;
}

export default function MapScreenWeb() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Map">>();
  const route = useRoute<R>();
  const filter = route.params || {};
  const { t } = useLang();
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const placemarksRef = useRef<Map<string, any>>(new Map());
  const listRef = useRef<FlatList<TaskWithGeo>>(null);
  const [tasks, setTasks] = useState<TaskWithGeo[]>([]);
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const apiKey = yandexMapsApiKey();

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
    if (selectedIndex >= 0) {
      listRef.current?.scrollToIndex({ index: selectedIndex, animated: true, viewPosition: 0.5 });
    }
  }, [selectedIndex]);

  useEffect(() => {
    let cancelled = false;
    if (!apiKey || !mapNodeRef.current) return;
    loadYandexMaps(apiKey)
      .then((ymaps) => {
        if (cancelled || !mapNodeRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new ymaps.Map(
            mapNodeRef.current,
            { center: [MOSCOW_CENTER.lat, MOSCOW_CENTER.lng], zoom: 10, controls: ["zoomControl", "geolocationControl"] },
            { suppressMapOpenBlock: true }
          );
          const emitBounds = () => {
            if (!mapRef.current) return;
            const b = mapRef.current.getBounds();
            setBounds(parseMapBounds({ southWest: b[0], northEast: b[1] }));
          };
          mapRef.current.events.add("actionend", emitBounds);
          mapRef.current.events.add("boundschange", emitBounds);
          emitBounds();
          setMapReady(true);
        }
        setMapError(null);
      })
      .catch((err: unknown) => setMapError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.ymaps) return;
    placemarksRef.current.forEach((pm) => mapRef.current.geoObjects.remove(pm));
    placemarksRef.current.clear();

    const layout = window.ymaps.templateLayoutFactory.createClass(
      `<div style="background:#232323;color:#fff;padding:10px 12px;border-radius:14px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.28);max-width:220px;font-family:inherit;{{ properties.active ? 'outline:2px solid #D9F36B;outline-offset:2px;' : '' }}">
        {{ properties.photoUrl ? '<img src="' + properties.photoUrl + '" style="width:100%;height:64px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />' : '' }}
        <div style="font-size:12px;font-weight:700;white-space:nowrap;">{{ properties.priceLabel }}</div>
        <div style="font-size:12px;font-weight:800;margin-top:4px;line-height:1.35;">{{ properties.title }}</div>
        {{ properties.location ? '<div style="font-size:11px;margin-top:4px;line-height:1.35;opacity:0.9;">' + properties.location + '</div>' : '' }}
      </div>`
    );

    mapPoints.forEach((point) => {
      const active = selectedId === point.id;
      const placemark = new window.ymaps!.Placemark(
        [point.lat, point.lng],
        {
          priceLabel: point.priceLabel || point.price,
          title: point.title,
          location: [point.city, point.address].filter(Boolean).join(", "),
          photoUrl: point.photoUrl || "",
          active: active ? "1" : "",
          hintContent: point.title,
        },
        {
          iconLayout: "default#imageWithContent",
          iconImageHref: TRANSPARENT_PIXEL,
          iconImageSize: [1, 1],
          iconImageOffset: [0, 0],
          iconContentLayout: layout,
          iconContentOffset: [-88, -72],
          iconContentSize: [176, 120],
          zIndex: active ? 1000 : 1,
        }
      );
      placemark.events.add("click", () => setSelectedId(point.id));
      mapRef.current.geoObjects.add(placemark);
      placemarksRef.current.set(point.id, placemark);
    });

    mapRef.current.container.fitToViewport();
  }, [mapPoints, selectedId, mapReady]);

  useEffect(() => {
    return () => {
      mapRef.current?.destroy?.();
      mapRef.current = null;
      placemarksRef.current.clear();
    };
  }, []);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setCoords({ lat: latitude, lng: longitude });
      mapRef.current?.setCenter([latitude, longitude], 12);
      mapRef.current?.container.fitToViewport();
    });
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
    <SafeAreaView style={styles.root} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.mapPane}>
        <View ref={mapNodeRef as any} style={styles.map} />
        {(!apiKey || mapError) && (
          <View style={styles.mapOverlayMessage} pointerEvents="none">
            <Text style={styles.hint}>{!apiKey ? t("map_key_missing") : mapError}</Text>
          </View>
        )}
        <View style={styles.header}>
          <View style={styles.segment}>
            <TouchableOpacity style={styles.segmentBtn} onPress={() => navigation.navigate("TasksList", navFilters)}>
              <Text style={styles.segmentInactive}>{t("list_view")}</Text>
            </TouchableOpacity>
            <View style={styles.segmentActive}>
              <Text style={styles.segmentActiveText}>{t("map_view")}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.locateBtn} onPress={locate}>
          <Ionicons name="navigate" size={22} color={colors.black} />
        </TouchableOpacity>
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.black} />
          </View>
        )}
      </View>

      <View style={styles.listPane}>
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
                  category={categories.find((c) => String(c.id) === String(item.category_id || item.category))}
                  onPress={() => navigation.navigate("TaskDetail", { taskId: String(item.id) })}
                />
              </View>
            )}
            contentContainerStyle={styles.listContent}
            onScrollToIndexFailed={() => undefined}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.lavender50 },
  mapPane: { flex: 0.58, position: "relative" },
  listPane: { flex: 0.42, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  map: { ...StyleSheet.absoluteFillObject },
  header: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.md, zIndex: 2 },
  segment: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: colors.lavender100,
    borderRadius: radii.full,
    padding: 4,
  },
  segmentBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radii.full },
  segmentInactive: { fontSize: 14, fontWeight: "700", color: colors.neutral500 },
  segmentActive: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radii.full, backgroundColor: colors.white },
  segmentActiveText: { fontSize: 14, fontWeight: "700", color: colors.black },
  mapOverlayMessage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    backgroundColor: colors.lavender50,
  },
  hint: { ...typography.small, color: colors.neutral500, textAlign: "center" },
  locateBtn: {
    position: "absolute",
    right: spacing.xl,
    top: 72,
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
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
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
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 16, gap: 10 },
  cardSelected: { borderRadius: 24, borderWidth: 2, borderColor: "#D9F36B" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.neutral500, textAlign: "center" },
  errorText: { color: colors.neutral600, textAlign: "center", marginBottom: 8 },
  retryText: { fontWeight: "700", color: colors.black },
});
