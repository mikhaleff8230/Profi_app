import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PlaceCard } from "../components/PlaceCard";
import { listPlaces, setPlaceFavorite } from "../src/services/places";
import type { Place } from "../src/types/place";
import { colors } from "../src/theme";
import type { RootStackParamList } from "../src/navigation/types";
type Nav = NativeStackNavigationProp<RootStackParamList>;
export default function FavoritesScreen() { const navigation = useNavigation<Nav>(); const [places, setPlaces] = useState<Place[]>([]); const [loading, setLoading] = useState(true); const load = useCallback(() => { setLoading(true); listPlaces({ favorites: true }).then(setPlaces).finally(() => setLoading(false)); }, []); useFocusEffect(load); return <SafeAreaView style={styles.root}><View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={28} color={colors.black} /></TouchableOpacity><Text style={styles.title}>Избранное</Text><View style={{ width: 28 }} /></View><View style={styles.tabs}><View style={[styles.tab, styles.active]}><Text style={styles.activeText}>Плейсы</Text></View><View style={styles.tab}><Text>Мастера</Text></View></View>{loading ? <ActivityIndicator style={{ marginTop: 50 }} color={colors.black} /> : <ScrollView contentContainerStyle={styles.grid}>{places.map((place) => <View key={place.id} style={styles.card}><PlaceCard place={place} onPress={() => navigation.navigate("PlaceDetail", { placeId: place.id })} onFavorite={async () => { await setPlaceFavorite(place.id, false); setPlaces((items) => items.filter((item) => item.id !== place.id)); }} /></View>)}</ScrollView>}</SafeAreaView>; }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.white }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }, title: { fontSize: 21, fontWeight: "900" }, tabs: { flexDirection: "row", backgroundColor: "#F2F4F8", marginHorizontal: 16, borderRadius: 16, padding: 3 }, tab: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, active: { backgroundColor: colors.accent }, activeText: { fontWeight: "900" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 14 }, card: { width: "48%" } });
