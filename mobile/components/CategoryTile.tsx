import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLang } from "../src/context/LangContext";
import { colors, radii } from "../src/theme";

export type CategoryTileData = { id: number; name_ru: string; icon?: string };

const FALLBACK_ICON: keyof typeof Ionicons.glyphMap = "grid-outline";

function iconFor(iconName?: string): keyof typeof Ionicons.glyphMap {
  if (!iconName) return FALLBACK_ICON;
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    Wrench: "construct-outline",
    Home: "home-outline",
    Sparkles: "sparkles-outline",
    Car: "car-outline",
    Laptop: "laptop-outline",
    Heart: "heart-outline",
    LayoutGrid: "grid-outline",
  };
  return map[iconName] ?? FALLBACK_ICON;
}

export function CategoryTile({ cat, onPress }: { cat: CategoryTileData; onPress: () => void }) {
  const { lang } = useLang();
  const label = cat.name_ru;
  const icon = iconFor(cat.icon);
  return (
    <TouchableOpacity style={styles.wrap} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={26} color={colors.black} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", gap: 8, padding: 10, borderRadius: 16 },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.lavender100,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 11, fontWeight: "600", color: colors.black, textAlign: "center", lineHeight: 14 },
});
