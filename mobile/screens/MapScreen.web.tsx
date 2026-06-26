import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TaskCardRow, type TaskItem } from "../components/TaskCardRow";
import type { CategoryTileData } from "../components/CategoryTile";
import { apiFetch } from "../src/api";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import {
  formatMapOrderCount,
  MOSCOW_CENTER,
  pointBalloon,
  toYandexPoints,
  yandexMapsApiKey,
  type YandexMapPoint,
} from "../src/maps/yandexMapHtml";
import type { RootStackParamList } from "../src/navigation/types";

declare global {
  interface Window {
    ymaps?: any;
    __proffiYandexMapsPromise?: Promise<any>;
  }
}

type R = RouteProp<RootStackParamList, "Map">;
type TaskWithGeo = TaskItem & { lat?: number | null; lng?: number | null };

function loadYandexMaps(apiKey: string): Promise<any> {
  if (window.ymaps) {
    return new Promise((resolve) => window.ymaps.ready(() => resolve(window.ymaps)));
  }
  if (window.__proffiYandexMapsPromise) return window.__proffiYandexMapsPromise;
  window.__proffiYandexMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => window.ymaps.ready(() => resolve(window.ymaps));
    script.onerror = () => reject(new Error("Не удалось загрузить Яндекс.Карты"));
    document.head.appendChild(script);
  });
  return window.__proffiYandexMapsPromise;
}

export default function MapScreenWeb() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Map">>();
  const route = useRoute<R>();
  const filter = route.params || {};
  const { t, lang } = useLang();
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const geoObjectsRef = useRef<any>(null);
  const [tasks, setTasks] = useState<TaskWithGeo[]>([]);
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [selected, setSelected] = useState<TaskWithGeo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const apiKey = yandexMapsApiKey();

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.category) params.set("category", filter.category);
      if (filter.q) params.set("q", filter.q);
      if (filter.city) params.set("city", filter.city);
      const qs = params.toString();
      const [catData, taskData] = await Promise.all([
        apiFetch("/categories", { method: "GET" }),
        apiFetch(qs ? `/tasks?${qs}` : "/tasks", { method: "GET" }),
      ]);
      setCategories(Array.isArray(catData) ? catData : []);
      setTasks(Array.isArray(taskData) ? (taskData as TaskWithGeo[]) : []);
      setSelected(null);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filter.category, filter.city, filter.q]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const points = useMemo(
    () => toYandexPoints(tasks).map((point) => ({ ...point, balloon: pointBalloon(point) })),
    [tasks]
  );

  useEffect(() => {
    let cancelled = false;
    if (!apiKey || !mapNodeRef.current) return;
    loadYandexMaps(apiKey)
      .then((ymaps) => {
        if (cancelled || !mapNodeRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new ymaps.Map(
            mapNodeRef.current,
            {
              center: [MOSCOW_CENTER.lat, MOSCOW_CENTER.lng],
              zoom: 10,
              controls: ["zoomControl", "geolocationControl"],
            },
            { suppressMapOpenBlock: true }
          );
        }
        if (geoObjectsRef.current) {
          mapRef.current.geoObjects.remove(geoObjectsRef.current);
        }
        const collection = new ymaps.GeoObjectCollection();
        points.forEach((point: YandexMapPoint & { balloon: string }) => {
          const placemark = new ymaps.Placemark(
            [point.lat, point.lng],
            { balloonContent: point.balloon, hintContent: point.title },
            { preset: "islands#blackStretchyIcon", iconColor: "#111111" }
          );
          placemark.events.add("click", () => {
            const task = tasks.find((item) => String(item.id) === point.id);
            if (task) setSelected(task);
          });
          collection.add(placemark);
        });
        geoObjectsRef.current = collection;
        mapRef.current.geoObjects.add(collection);
        if (points.length > 1) {
          mapRef.current.setBounds(collection.getBounds(), { checkZoomRange: true, zoomMargin: 48 });
        } else if (points.length === 1) {
          mapRef.current.setCenter([points[0].lat, points[0].lng], 13);
        }
        setMapError(null);
      })
      .catch((error: unknown) => setMapError(error instanceof Error ? error.message : String(error)));
    return () => {
      cancelled = true;
    };
  }, [apiKey, points, tasks]);

  useEffect(() => {
    return () => {
      mapRef.current?.destroy?.();
      mapRef.current = null;
      geoObjectsRef.current = null;
    };
  }, []);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      mapRef.current?.setCenter([latitude, longitude], 12);
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom", "left", "right"]}>
      <View ref={mapNodeRef as any} style={styles.map} />

      {(!apiKey || mapError || points.length === 0) && (
        <View style={styles.mapOverlayMessage} pointerEvents="none">
          <Ionicons name="map-outline" size={42} color={colors.neutral500} />
          <Text style={styles.title}>Яндекс.Карты</Text>
          <Text style={styles.hint}>
            {!apiKey
              ? "Добавьте EXPO_PUBLIC_YANDEX_MAPS_API_KEY в mobile/.env"
              : mapError || "Заказов с координатами пока нет"}
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.segment}>
          <TouchableOpacity
            style={styles.segmentBtn}
            onPress={() => navigation.navigate("TasksList", { category: filter.category, q: filter.q, city: filter.city })}
          >
            <Text style={styles.segmentInactive}>{t("list_view")}</Text>
          </TouchableOpacity>
          <View style={styles.segmentActive}>
            <Text style={styles.segmentActiveText}>{t("map_view")}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.countPill}
        onPress={() => navigation.navigate("TasksList", { category: filter.category, q: filter.q, city: filter.city })}
      >
        <Ionicons name="list-outline" size={18} color={colors.black} />
        <Text style={styles.countText}>{formatMapOrderCount(points.length, lang)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.locateBtn} onPress={locate}>
        <Ionicons name="navigate" size={22} color={colors.black} />
      </TouchableOpacity>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.black} />
        </View>
      )}

      <View style={styles.sheet}>
        <View style={styles.handle} />
        {selected ? (
          <View>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={styles.sheetClose}>×</Text>
            </TouchableOpacity>
            <TaskCardRow
              task={selected}
              category={categories.find((c) => String(c.id) === String(selected.category))}
              onPress={() => {
                setSelected(null);
                navigation.navigate("TaskDetail", { taskId: String(selected.id) });
              }}
            />
          </View>
        ) : (
          <Text style={styles.sheetHint}>
            {points.length ? t("map_open_tasks") : "Заказов с координатами пока нет"}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.lavender50 },
  map: { ...StyleSheet.absoluteFillObject },
  header: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  segment: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: colors.lavender100,
    borderRadius: radii.full,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
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
    gap: spacing.sm,
    backgroundColor: colors.lavender50,
  },
  title: { ...typography.headline },
  hint: { ...typography.small, color: colors.neutral500, textAlign: "center" },
  countPill: {
    position: "absolute",
    left: spacing.xl,
    bottom: 236,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  countText: { fontSize: 14, fontWeight: "700" },
  locateBtn: {
    position: "absolute",
    right: spacing.xl,
    bottom: 236,
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
  loader: { marginTop: spacing.xxl },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: 260,
    backgroundColor: colors.lavender50,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  handle: { width: 48, height: 4, backgroundColor: colors.neutral300, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetClose: { fontSize: 18, color: colors.neutral500, marginBottom: 8, textAlign: "right" },
  sheetHint: { ...typography.body, color: colors.neutral500, textAlign: "center", paddingVertical: 16 },
});
