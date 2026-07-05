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
  budget_type?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  budget_label?: string | null;
  city?: string | null;
  address?: string | null;
  created_at?: string | null;
  category?: string | number | null;
  category_id?: string | number | null;
  status?: string;
  is_closed?: boolean;
  has_applied?: boolean;
  lat?: number | null;
  lng?: number | null;
  photos?: TaskPhoto[] | null;
  distance_km?: number | null;
  is_favorite?: boolean;
};

export type CategoryItem = { id: number | string; name_ru: string };

type Props = {
  task: TaskItem;
  category?: CategoryItem;
  onPress: () => void;
  onToggleFavorite?: () => void;
};

const CLOSED_STATUSES = new Set(["cancelled", "closed", "done", "completed"]);

export function TaskCardRow({ task, category, onPress, onToggleFavorite }: Props) {
  const { lang, t } = useLang();
  const catName = category ? category.name_ru : null;
  const photoUri = resolvePhotoUrl(task.photos?.[0] ?? null);
  const priceLabel = formatTaskBudget(task);
  const location = [task.city, task.address].filter(Boolean).join(", ");
  const hasApplied = Boolean(task.has_applied);
  const isClosed = Boolean(task.is_closed) || CLOSED_STATUSES.has(task.status || "");
  const dimmed = hasApplied || isClosed;

  return (
    <TouchableOpacity style={[styles.card, dimmed && styles.cardDimmed]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.row}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={[styles.thumb, dimmed && styles.thumbDimmed]} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbPlaceholder, dimmed && styles.thumbDimmed]}>
            <Ionicons name="image-outline" size={20} color={colors.neutral400} />
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.top}>
            <Text style={styles.title} numberOfLines={2}>
              {task.title}
            </Text>
            {onToggleFavorite ? (
              <TouchableOpacity onPress={onToggleFavorite} hitSlop={8} style={styles.favBtn}>
                <Ionicons
                  name={task.is_favorite ? "heart" : "heart-outline"}
                  size={20}
                  color={task.is_favorite ? colors.black : colors.neutral400}
                />
              </TouchableOpacity>
            ) : null}
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
            {task.status && !hasApplied && !isClosed ? (
              <Text style={styles.status}>{t(task.status) || task.status}</Text>
            ) : null}
            <Text style={styles.time}>{timeAgo(task.created_at, lang)}</Text>
          </View>
        </View>
      </View>
      {(hasApplied || isClosed) && (
        <View style={[styles.statusBtn, isClosed ? styles.statusClosed : styles.statusApplied]}>
          <Text style={styles.statusBtnText}>{isClosed ? "Закрыто" : "Вы откликнулись"}</Text>
        </View>
      )}
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
  cardDimmed: { opacity: 0.65 },
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
  thumbDimmed: { opacity: 0.55 },
  body: { flex: 1 },
  top: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.sm },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.black, lineHeight: 22 },
  favBtn: { paddingHorizontal: 2 },
  desc: { fontSize: 14, color: colors.neutral500, marginBottom: spacing.sm },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, width: "100%" },
  spacer: { flex: 1, minWidth: 8 },
  metaStrong: { fontSize: 12, fontWeight: "600", color: colors.neutral400 },
  dot: { fontSize: 12, color: colors.neutral400 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1, maxWidth: "55%" },
  metaText: { fontSize: 12, color: colors.neutral400 },
  status: { fontSize: 12, color: colors.neutral500, fontWeight: "600" },
  time: { fontSize: 12, color: colors.neutral400 },
  statusBtn: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusApplied: { backgroundColor: colors.neutral600 },
  statusClosed: { backgroundColor: colors.black },
  statusBtnText: { color: colors.white, fontSize: 12, fontWeight: "700" },
});
