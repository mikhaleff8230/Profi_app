import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TabScreenLayout } from "../components/TabScreenLayout";
import { TreaboHeader } from "../components/TreaboHeader";
import { PlaceCard } from "../components/PlaceCard";
import { apiFetch } from "../src/api";
import { colors } from "../src/theme";
import { listPlaces, setPlaceFavorite } from "../src/services/places";
import type { Place } from "../src/types/place";
import type { RootStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Category = { id: string; name_ru: string };

export default function HomePlacesScreen() {
  const navigation = useNavigation<Nav>();
  const [places, setPlaces] = useState<Place[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/categories", { method: "GET", auth: false })
      .then((value) => setCategories(Array.isArray(value) ? value : []))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setPlaces(await listPlaces({ category_id: categoryId || undefined, sort: "new" }));
    } catch (e) {
      setPlaces([]);
      setError(e instanceof Error ? e.message : "Не удалось загрузить Плейсы");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const chips = useMemo(() => [{ id: "", name_ru: "Все" }, ...categories.slice(0, 7)], [categories]);
  const toggleFavorite = async (place: Place) => {
    const next = !place.is_favorite;
    setPlaces((rows) => rows.map((row) => row.id === place.id ? { ...row, is_favorite: next } : row));
    try { await setPlaceFavorite(place.id, next); } catch { setPlaces((rows) => rows.map((row) => row.id === place.id ? { ...row, is_favorite: !next } : row)); }
  };

  return (
    <TabScreenLayout>
      <TreaboHeader onSearch={() => navigation.navigate("Search")} onFilter={() => navigation.navigate("Search", { filtersOpen: true })} onMap={() => navigation.navigate("MainTabs", { screen: "Map" })} />
      <View style={styles.chipTrack}>
        <FlatList
          horizontal
          data={chips}
          keyExtractor={(item) => item.id || "all"}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => <TouchableOpacity style={[styles.chip, item.id === categoryId && styles.chipActive]} onPress={() => setCategoryId(item.id)}><Text style={[styles.chipText, item.id === categoryId && styles.chipTextActive]}>{item.name_ru}</Text></TouchableOpacity>}
        />
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator color={colors.black} /><Text style={styles.loadingText}>Загружаем Плейсы…</Text></View> : error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => load()}><Text style={styles.retryText}>Повторить</Text></TouchableOpacity></View> : places.length === 0 ? <View style={styles.center}><Text style={styles.emptyTitle}>Плейсов пока нет</Text><Text style={styles.emptyText}>Покажите свою первую работу через кнопку «Добавить».</Text></View> : (
        <FlatList
          data={places}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.black} />}
          renderItem={({ item }) => <PlaceCard place={item} onPress={() => navigation.navigate("PlaceDetail", { placeId: item.id })} onFavorite={() => toggleFavorite(item)} />}
        />
      )}
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  chipTrack: { minHeight: 52 },
  chips: { paddingHorizontal: 16, gap: 9, paddingBottom: 10 },
  chip: { height: 42, borderRadius: 17, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F5F7" },
  chipActive: { backgroundColor: colors.accent },
  chipText: { fontSize: 14, fontWeight: "700", color: colors.black },
  chipTextActive: { fontWeight: "900" },
  grid: { paddingHorizontal: 14, paddingBottom: 28, gap: 12 },
  row: { gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 },
  loadingText: { marginTop: 10, color: colors.navInactive },
  error: { color: colors.neutral600, textAlign: "center", lineHeight: 21 },
  retry: { marginTop: 14, backgroundColor: colors.accent, borderRadius: 18, paddingHorizontal: 22, paddingVertical: 12 },
  retryText: { fontWeight: "900" },
  emptyTitle: { fontSize: 21, fontWeight: "900", color: colors.black },
  emptyText: { marginTop: 8, color: colors.navInactive, textAlign: "center", lineHeight: 21 },
});
