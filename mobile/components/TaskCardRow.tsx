import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLang } from "../src/context/LangContext";
import { timeAgo } from "../src/utils/timeAgo";
import { formatTaskBudget } from "../src/utils/currency";
import { resolvePhotoUrl } from "../src/utils/photos";
import type { TaskPhoto } from "../src/types/proffi";
import { Badge } from "./Badge";
import { colors, spacing } from "../src/theme";

export type TaskItem = {
  id: string | number;
  title: string;
  description?: string | null;
  budget?: number | null;
  city?: string | null;
  address?: string | null;
  created_at?: string | null;
  category?: string | number | null;
  category_id?: string | number | null;
  status?: string;
  lat?: number | null;
  lng?: number | null;
  photos?: TaskPhoto[] | null;
  distance_km?: number | null;
};

export type CategoryItem = { id: number | string; name_ru: string };

type Props = {
  task: TaskItem;
  category?: CategoryItem;
  onPress: () => void;
};

export function TaskCardRow({ task, category, onPress }: Props) {
  const { lang, t } = useLang();
  const catName = category ? category.name_ru : null;
  const photoUri = resolvePhotoUrl(task.photos?.[0] ?? null);
  const priceLabel = formatTaskBudget(task.budget);
  const location = [task.city, task.address].filter(Boolean).join(", ");

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.row}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="image-outline" size={20} color={colors.neutral400} />
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.top}>
            <Text style={styles.title} numberOfLines={2}>
              {task.title}
            </Text>
            {priceLabel ? <Badge variant="default">{priceLabel}</Badge> : null}
          </View>
          {task.description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {task.description}
            </Text>
          ) : null}
          <View style={styles.meta}>
            {catName ? <Text style={styles.metaStrong}>{catName}</Text> : null}
            {catName && location ? <Text style={styles.dot}>•</Text> : null}
            {location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={colors.neutral400} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {location}
                </Text>
              </View>
            ) : null}
            {task.distance_km != null ? (
              <Text style={styles.metaText}> · {task.distance_km} {t("distance_km")}</Text>
            ) : null}
            <View style={styles.spacer} />
            {task.status ? <Text style={styles.status}>{t(task.status) || task.status}</Text> : null}
            <Text style={styles.time}>{timeAgo(task.created_at, lang)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral100,
  },
  row: { flexDirection: "row", gap: 12 },
  thumb: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.lavender50 },
  thumbPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.lavender50,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  top: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.sm },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.black, lineHeight: 22 },
  desc: { fontSize: 14, color: colors.neutral500, marginBottom: spacing.sm },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, width: "100%" },
  spacer: { flex: 1, minWidth: 8 },
  metaStrong: { fontSize: 12, fontWeight: "600", color: colors.neutral400 },
  dot: { fontSize: 12, color: colors.neutral400 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1, maxWidth: "55%" },
  metaText: { fontSize: 12, color: colors.neutral400 },
  status: { fontSize: 12, color: colors.neutral500, fontWeight: "600" },
  time: { fontSize: 12, color: colors.neutral400 },
});
