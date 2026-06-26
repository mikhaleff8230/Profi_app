import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { apiFetch } from "../src/api";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import {
  buildYandexMapHtml,
  formatMapOrderCount,
  pointBalloon,
  toYandexPoints,
  yandexMapsApiKey,
} from "../src/maps/yandexMapHtml";
import type { RootStackParamList } from "../src/navigation/types";

type R = RouteProp<RootStackParamList, "Map">;
type TaskWithGeo = TaskItem & { lat?: number | null; lng?: number | null };

export default function MapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Map">>();
  const route = useRoute<R>();
  const filter = route.params || {};
  const { t, lang } = useLang();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<TaskWithGeo[]>([]);
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [selected, setSelected] = useState<TaskWithGeo | null>(null);
  const [loading, setLoading] = useState(true);
  const [webviewReady, setWebviewReady] = useState(false);
  const apiKey = yandexMapsApiKey();
  const sheetPad = Math.max(insets.bottom, 16);
  const floatBottom = 220 + insets.bottom;

  const loadTasks = useCallback(
    async (lat?: number, lng?: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filter.category) params.set("category", filter.category);
        if (filter.q) params.set("q", filter.q);
        if (filter.city) params.set("city", filter.city);
        if (lat != null && lng != null) {
          params.set("lat", String(lat));
          params.set("lng", String(lng));
          params.set("sort", "distance");
        }
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
    },
    [filter.category, filter.city, filter.q]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const points = useMemo(
    () => toYandexPoints(tasks).map((point) => ({ ...point, balloon: pointBalloon(point) })),
    [tasks]
  );

  const html = useMemo(() => (apiKey ? buildYandexMapHtml(points, apiKey) : ""), [apiKey, points]);

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("", t("geo_denied"));
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    loadTasks(loc.coords.latitude, loc.coords.longitude);
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "ready") setWebviewReady(true);
      if (message.type === "select") {
        const task = tasks.find((item) => String(item.id) === String(message.payload?.id));
        if (task) setSelected(task);
      }
    } catch {
      /* ignore messages from the map runtime */
    }
  };

  return (
    <View style={styles.root}>
      {apiKey ? (
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={styles.missingKey}>
          <Ionicons name="map-outline" size={42} color={colors.neutral500} />
          <Text style={styles.missingTitle}>Яндекс.Карты</Text>
          <Text style={styles.missingText}>Добавьте EXPO_PUBLIC_YANDEX_MAPS_API_KEY в mobile/.env</Text>
        </View>
      )}

      <SafeAreaView style={styles.overlay} edges={["top"]}>
        <View style={styles.toggleRow}>
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
      </SafeAreaView>

      <TouchableOpacity
        style={[styles.countPill, { bottom: floatBottom }]}
        onPress={() => navigation.navigate("TasksList", { category: filter.category, q: filter.q, city: filter.city })}
      >
        <Ionicons name="list-outline" size={18} color={colors.black} />
        <Text style={styles.countText}>{formatMapOrderCount(points.length, lang)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.locateBtn, { bottom: floatBottom }]} onPress={locate}>
        <Ionicons name="navigate" size={22} color={colors.black} />
      </TouchableOpacity>

      {(loading || (apiKey && !webviewReady && points.length > 0)) && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.black} />
        </View>
      )}

      <View style={[styles.sheet, { paddingBottom: sheetPad }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, pointerEvents: "box-none" },
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
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentActiveText: { fontSize: 14, fontWeight: "700", color: colors.black },
  countPill: {
    position: "absolute",
    left: spacing.xl,
    zIndex: 3,
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
    elevation: 6,
  },
  countText: { fontSize: 14, fontWeight: "700" },
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
    backgroundColor: colors.lavender50,
    gap: spacing.sm,
  },
  missingTitle: { ...typography.headline },
  missingText: { ...typography.small, color: colors.neutral500, textAlign: "center" },
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
    elevation: 12,
    zIndex: 4,
  },
  handle: { width: 48, height: 4, backgroundColor: colors.neutral300, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetClose: { fontSize: 18, color: colors.neutral500, marginBottom: 8, textAlign: "right" },
  sheetHint: { ...typography.body, color: colors.neutral500, textAlign: "center", paddingVertical: 16 },
});
