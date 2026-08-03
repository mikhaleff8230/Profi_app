import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fileUrl } from "../src/api";
import { colors } from "../src/theme";

export type CategoryTileData = { id: number | string; name_ru: string; icon?: string; image?: string | null };

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
  const label = cat.name_ru;
  const icon = iconFor(cat.icon);
  const imageUri = cat.image ? fileUrl(cat.image) : null;
  return (
    <TouchableOpacity style={styles.wrap} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconBox}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.catImage} resizeMode="cover" />
        ) : (
          <Ionicons name={icon} size={26} color={colors.black} />
        )}
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
    overflow: "hidden",
  },
  catImage: { width: 56, height: 56 },
  label: { fontSize: 11, fontWeight: "600", color: colors.black, textAlign: "center", lineHeight: 14 },
});
