import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, type Region } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/api";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import { TaskCardRow, type TaskItem } from "../components/TaskCardRow";
import type { CategoryTileData } from "../components/CategoryTile";
import type { RootStackParamList } from "../src/navigation/types";

const MOSCOW: Region = {
  latitude: 55.7558,
  longitude: 37.6173,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

type TaskWithGeo = TaskItem & { lat?: number | null; lng?: number | null };

export default function MapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Map">>();
  const { t } = useLang();
  const mapRef = useRef<MapView>(null);
  const [tasks, setTasks] = useState<TaskWithGeo[]>([]);
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [selected, setSelected] = useState<TaskWithGeo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async (lat?: number, lng?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (lat != null && lng != null) {
        params.set("lat", String(lat));
        params.set("lng", String(lng));
      }
      const q = params.toString();
      const [catData, taskData] = await Promise.all([
        apiFetch("/categories", { method: "GET" }),
        apiFetch(q ? `/tasks?${q}` : "/tasks", { method: "GET" }),
      ]);
      setCategories(Array.isArray(catData) ? catData : []);
      setTasks(Array.isArray(taskData) ? taskData : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const withCoords = useMemo(() => tasks.filter((x) => x.lat != null && x.lng != null), [tasks]);

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("", t("geo_denied"));
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    const next: Region = {
      latitude,
      longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
    mapRef.current?.animateToRegion(next, 600);
    loadTasks(latitude, longitude);
  };

  return (
    <View style={styles.root}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={MOSCOW} showsUserLocation>
        {withCoords.map((task) => (
          <Marker
            key={task.id}
            coordinate={{ latitude: task.lat as number, longitude: task.lng as number }}
            onPress={() => setSelected(task)}
          >
            <View style={styles.dot} />
          </Marker>
        ))}
      </MapView>

      <SafeAreaView style={styles.overlay} edges={["top"]}>
        <View style={styles.toggleRow}>
          <View style={styles.segment}>
            <TouchableOpacity style={styles.segmentBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.segmentInactive}>{t("list_view")}</Text>
            </TouchableOpacity>
            <View style={styles.segmentActive}>
              <Text style={styles.segmentActiveText}>{t("map_view")}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <TouchableOpacity style={styles.countPill} onPress={() => navigation.goBack()}>
        <Ionicons name="list-outline" size={18} color={colors.black} />
        <Text style={styles.countText}>
          {tasks.length} {t("orders_count")}
        </Text>
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
              <Text style={styles.sheetClose}>✕</Text>
            </TouchableOpacity>
            <TaskCardRow
              task={selected}
              category={categories.find((c) => c.id === selected.category)}
              onPress={() => {}}
            />
          </View>
        ) : (
          <Text style={styles.sheetHint}>{t("map_open_tasks")}</Text>
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
    bottom: 220,
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
    bottom: 220,
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
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.black,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
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
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
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
