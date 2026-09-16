import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PlaceCard } from "../components/PlaceCard";
import { apiFetch } from "../src/api";
import { colors } from "../src/theme";
import { listPlaces } from "../src/services/places";
import type { Place } from "../src/types/place";
import type { RootStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "Search">;
type Category = { id: string; name_ru: string };

export default function PlaceSearchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [online, setOnline] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(Boolean(route.params?.filtersOpen));
  const [loading, setLoading] = useState(false);

  useEffect(() => { apiFetch("/categories", { method: "GET", auth: false }).then((data) => setCategories(Array.isArray(data) ? data : [])).catch(() => undefined); }, []);
  const search = useCallback(async () => {
    setLoading(true);
    try { setPlaces(await listPlaces({ search: query || undefined, category_id: categoryId || undefined, price_from: priceFrom ? Number(priceFrom) : undefined, price_to: priceTo ? Number(priceTo) : undefined, sort: "new" })); }
    catch { setPlaces([]); }
    finally { setLoading(false); }
  }, [query, categoryId, priceFrom, priceTo]);
  useEffect(() => { const timer = setTimeout(() => void search(), 240); return () => clearTimeout(timer); }, [search]);

  const reset = () => { setCategoryId(""); setPriceFrom(""); setPriceTo(""); setOnline(false); };
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={28} color={colors.black} /></TouchableOpacity>
        <View style={styles.searchBox}><Ionicons name="search" size={22} color={colors.navInactive} /><TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Поиск работ и мастеров" placeholderTextColor={colors.navInactive} returnKeyType="search" onSubmitEditing={search} />{query ? <TouchableOpacity onPress={() => setQuery("")}><Ionicons name="close-circle" size={20} color={colors.neutral400} /></TouchableOpacity> : null}</View>
        <TouchableOpacity style={styles.filterButton} onPress={() => navigation.navigate("MainTabs", { screen: "Map" })}><Ionicons name="map-outline" size={24} color={colors.black} /></TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setFiltersOpen(true)}><Ionicons name="options-outline" size={24} color={colors.black} /></TouchableOpacity>
      </View>
      <View style={styles.tabs}>{["Все", "Плейсы", "Специалисты", "Услуги", "Заявки"].map((tab, i) => <View key={tab} style={[styles.tab, i === 0 && styles.tabActive]}><Text style={[styles.tabText, i === 0 && styles.tabTextActive]}>{tab}</Text></View>)}</View>
      <View style={styles.resultHead}><Text style={styles.resultTitle}>Найдено: {places.length}</Text><Text style={styles.sort}>Сортировка: <Text style={styles.sortStrong}>Новые⌄</Text></Text></View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.black} /> : <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>{places.map((place) => <PlaceCard key={place.id} place={place} variant="row" onPress={() => navigation.navigate("PlaceDetail", { placeId: place.id })} />)}</ScrollView>}

      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={() => setFiltersOpen(false)} /><SafeAreaView style={styles.sheet} edges={["bottom"]}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Фильтры</Text><TouchableOpacity onPress={reset}><Text style={styles.reset}>Сбросить все</Text></TouchableOpacity><TouchableOpacity onPress={() => setFiltersOpen(false)}><Ionicons name="close" size={30} color={colors.black} /></TouchableOpacity></View>
          <View style={styles.filterRow}><Ionicons name="location-outline" size={26} color={colors.black} /><Text style={styles.filterLabel}>Где</Text><Text style={styles.filterValue}>Москва</Text><Ionicons name="chevron-forward" size={20} color={colors.black} /></View>
          <View style={styles.filterBlock}><View style={styles.filterInline}><Ionicons name="radio-button-on-outline" size={26} color={colors.black} /><Text style={styles.filterLabel}>Радиус</Text><Text style={styles.filterValue}>10 км</Text></View><View style={styles.slider}><View style={styles.sliderActive} /><View style={styles.knob} /></View><View style={styles.sliderLabels}><Text>1 км</Text><Text>50 км</Text></View></View>
          <Text style={styles.subLabel}>Категория</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTrack}>{[{ id: "", name_ru: "Все" }, ...categories].map((cat) => <TouchableOpacity key={cat.id || "all"} style={[styles.categoryChip, categoryId === cat.id && styles.categoryChipActive]} onPress={() => setCategoryId(cat.id)}><Text style={styles.categoryText}>{cat.name_ru}</Text></TouchableOpacity>)}</ScrollView>
          <View style={styles.priceRow}><View style={styles.priceInput}><Text style={styles.priceCaption}>От</Text><TextInput value={priceFrom} onChangeText={setPriceFrom} keyboardType="number-pad" placeholder="0" style={styles.numberInput} /></View><View style={styles.priceInput}><Text style={styles.priceCaption}>До</Text><TextInput value={priceTo} onChangeText={setPriceTo} keyboardType="number-pad" placeholder="Любая" style={styles.numberInput} /></View></View>
          <View style={styles.filterRow}><Ionicons name="flash-outline" size={26} color={colors.black} /><Text style={styles.filterLabel}>Онлайн сейчас</Text><Switch value={online} onValueChange={setOnline} trackColor={{ false: "#D7DCE5", true: colors.accent }} thumbColor={colors.white} /></View>
          <TouchableOpacity style={styles.apply} onPress={() => { setFiltersOpen(false); void search(); }}><Text style={styles.applyText}>Показать {places.length} результатов</Text></TouchableOpacity>
        </SafeAreaView></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white }, header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  searchBox: { flex: 1, height: 50, borderRadius: 23, backgroundColor: "#F3F4F7", flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 15 }, searchInput: { flex: 1, fontSize: 15, color: colors.black },
  filterButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#F3F4F7", alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", gap: 7, paddingHorizontal: 14, paddingBottom: 13 }, tab: { flex: 1, minHeight: 40, borderRadius: 14, backgroundColor: "#F3F4F7", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }, tabActive: { backgroundColor: colors.accent }, tabText: { fontSize: 11, color: colors.black }, tabTextActive: { fontWeight: "900" },
  resultHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }, resultTitle: { fontSize: 20, fontWeight: "900" }, sort: { fontSize: 12, color: colors.navInactive }, sortStrong: { color: colors.black, fontWeight: "800" }, results: { paddingHorizontal: 14, paddingBottom: 28, gap: 12 },
  modalRoot: { flex: 1, justifyContent: "flex-end" }, backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,16,24,.52)" }, sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: "84%" }, handle: { width: 70, height: 5, borderRadius: 3, backgroundColor: "#C8CEDA", alignSelf: "center", marginBottom: 13 },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 }, sheetTitle: { flex: 1, fontSize: 27, fontWeight: "900" }, reset: { color: "#7182C3", fontSize: 15 }, filterRow: { minHeight: 64, borderRadius: 20, backgroundColor: "#F5F6F8", flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 17, marginBottom: 10 }, filterLabel: { flex: 1, fontSize: 18, fontWeight: "800" }, filterValue: { color: colors.neutral600, fontSize: 16 }, filterBlock: { borderRadius: 20, backgroundColor: "#F5F6F8", padding: 17, marginBottom: 12 }, filterInline: { flexDirection: "row", alignItems: "center", gap: 13 }, slider: { height: 5, marginHorizontal: 38, marginTop: 23, backgroundColor: "#DDE2EB", borderRadius: 3 }, sliderActive: { width: "36%", height: 5, backgroundColor: colors.accent, borderRadius: 3 }, knob: { position: "absolute", left: "33%", top: -8, width: 21, height: 21, borderRadius: 11, backgroundColor: colors.accent }, sliderLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 38, marginTop: 10 }, subLabel: { fontSize: 16, fontWeight: "900", marginBottom: 8 }, categoryTrack: { gap: 8, paddingBottom: 13 }, categoryChip: { paddingHorizontal: 15, height: 40, borderRadius: 14, backgroundColor: "#F3F4F7", justifyContent: "center" }, categoryChipActive: { backgroundColor: colors.accent }, categoryText: { fontWeight: "700" },
  priceRow: { flexDirection: "row", gap: 10, marginBottom: 11 }, priceInput: { flex: 1, borderRadius: 18, backgroundColor: "#F5F6F8", paddingHorizontal: 15, paddingVertical: 8 }, priceCaption: { fontSize: 11, color: colors.navInactive }, numberInput: { fontSize: 17, fontWeight: "800", paddingVertical: 3 }, apply: { minHeight: 60, borderRadius: 21, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginTop: 4 }, applyText: { fontSize: 18, fontWeight: "900" },
});
