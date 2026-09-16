import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../src/theme";

const logo = require("../assets/treabo-logo-official.png");

type Props = {
  city?: string;
  onSearch?: () => void;
  onFilter?: () => void;
  onMap?: () => void;
  compact?: boolean;
};

export function TreaboHeader({ city = "Москва", onSearch, onFilter, onMap, compact = false }: Props) {
  return (
    <View style={[styles.root, compact && styles.compact]}>
      <View style={styles.brand}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <View style={styles.cityRow}>
          <Ionicons name="location-outline" size={17} color={colors.navInactive} />
          <Text style={styles.city}>{city}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.black} />
        </View>
      </View>
      <View style={styles.actions}>
        {onSearch ? <TouchableOpacity style={styles.round} onPress={onSearch} accessibilityLabel="Поиск"><Ionicons name="search" size={24} color={colors.black} /></TouchableOpacity> : null}
        {onFilter ? <TouchableOpacity style={styles.round} onPress={onFilter} accessibilityLabel="Фильтры"><Ionicons name="options-outline" size={24} color={colors.black} /></TouchableOpacity> : null}
        {onMap ? <TouchableOpacity style={styles.round} onPress={onMap} accessibilityLabel="Карта"><Ionicons name="map-outline" size={24} color={colors.black} /></TouchableOpacity> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 },
  compact: { paddingBottom: 6 },
  brand: { flex: 1 },
  logo: { width: 148, height: 48 },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: -4, paddingLeft: 2 },
  city: { fontSize: 15, fontWeight: "700", color: colors.black },
  actions: { flexDirection: "row", gap: 8, paddingTop: 5 },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F5F6F8", alignItems: "center", justifyContent: "center" },
});
