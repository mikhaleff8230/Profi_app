import React, { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenLayout } from "../components/ScreenLayout";
import { apiFetch } from "../src/api";
import { colors, spacing } from "../src/theme";
import type { RootStackParamList } from "../src/navigation/types";
import { addSearchHistory, getSearchHistory, removeSearchHistoryItem } from "../src/utils/searchHistory";
import type { CategoryTileData } from "../components/CategoryTile";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskSearch">;

export default function TaskSearchScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    getSearchHistory().then(setHistory).catch(() => setHistory([]));
    apiFetch("/categories", { method: "GET" })
      .then((data) => {
        const cats = Array.isArray(data) ? (data as CategoryTileData[]) : [];
        setSuggestions(cats.slice(0, 8).map((c) => c.name_ru).filter(Boolean));
      })
      .catch(() => setSuggestions([]));
  }, []);

  const submit = useCallback(
    async (value = q) => {
      const trimmed = value.trim();
      const selectedCity = city.trim();
      if (trimmed) {
        const next = await addSearchHistory(trimmed);
        setHistory(next);
      }
      navigation.navigate("TasksList", {
        q: trimmed || undefined,
        city: selectedCity || undefined,
      });
    },
    [city, navigation, q]
  );

  const removeHistoryItem = async (item: string) => {
    const next = await removeSearchHistoryItem(item);
    setHistory(next);
  };

  return (
    <ScreenLayout bottomInset={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[styles.root, { paddingBottom: 96 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={colors.neutral500} />
            <TextInput
              style={styles.input}
              value={q}
              onChangeText={setQ}
              placeholder="Какой заказ ищете?"
              placeholderTextColor={colors.neutral400}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => void submit()}
            />
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="location-outline" size={20} color={colors.neutral500} />
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Город"
              placeholderTextColor={colors.neutral400}
              returnKeyType="search"
              onSubmitEditing={() => void submit()}
            />
          </View>

          {suggestions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Популярные категории</Text>
              <View style={styles.chips}>
                {suggestions.map((item) => (
                  <TouchableOpacity key={item} style={styles.chip} onPress={() => void submit(item)}>
                    <Text style={styles.chipText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {history.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>История запросов</Text>
              {history.map((item) => (
                <TouchableOpacity key={item} style={styles.historyRow} onPress={() => void submit(item)}>
                  <Ionicons name="time-outline" size={20} color={colors.neutral400} />
                  <Text style={styles.historyText}>{item}</Text>
                  <TouchableOpacity onPress={() => void removeHistoryItem(item)} hitSlop={8}>
                    <Ionicons name="close-outline" size={20} color={colors.neutral400} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), height: 64 + Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.findButton} onPress={() => void submit()}>
            <Text style={styles.find}>Найти</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { padding: spacing.lg, gap: 12 },
  searchBox: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.lavender50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 16, color: colors.black },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: colors.black, marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.lavender50, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  chipText: { fontSize: 13, color: colors.black, fontWeight: "600" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  historyText: { flex: 1, fontSize: 15, color: colors.black },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral100,
  },
  findButton: { borderRadius: 999, backgroundColor: colors.black, paddingHorizontal: 22, paddingVertical: 12 },
  find: { color: colors.white, fontSize: 16, fontWeight: "800" },
});
