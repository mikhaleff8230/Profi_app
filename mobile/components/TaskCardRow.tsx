import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLang } from "../src/context/LangContext";
import { timeAgo } from "../src/utils/timeAgo";
import { Badge } from "./Badge";
import { colors, spacing } from "../src/theme";

export type TaskItem = {
  id: string | number;
  title: string;
  description?: string | null;
  budget?: number | null;
  city?: string | null;
  created_at?: string | null;
  category?: string | number | null;
  status?: string;
  lat?: number | null;
  lng?: number | null;
};

export type CategoryItem = { id: number | string; name_ru: string };

type Props = {
  task: TaskItem;
  category?: CategoryItem;
  onPress: () => void;
};

export function TaskCardRow({ task, category, onPress }: Props) {
  const { lang, t } = useLang();
  const catName = category ? (category.name_ru) : null;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>
        {task.budget != null && task.budget > 0 && (
          <Badge variant="default">
            {task.budget} {t("rub")}
          </Badge>
        )}
      </View>
      {task.description ? (
        <Text style={styles.desc} numberOfLines={2}>
          {task.description}
        </Text>
      ) : null}
      <View style={styles.meta}>
        {catName ? <Text style={styles.metaStrong}>{catName}</Text> : null}
        {catName && task.city ? <Text style={styles.dot}>•</Text> : null}
        {task.city ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={12} color={colors.neutral400} />
            <Text style={styles.metaText}>{task.city}</Text>
          </View>
        ) : null}
        <View style={styles.spacer} />
        <Text style={styles.time}>{timeAgo(task.created_at, lang)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.neutral100,
  },
  top: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.sm },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.black, lineHeight: 22 },
  desc: { fontSize: 14, color: colors.neutral500, marginBottom: spacing.md },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, width: "100%" },
  spacer: { flex: 1, minWidth: 8 },
  metaStrong: { fontSize: 12, fontWeight: "600", color: colors.neutral400 },
  dot: { fontSize: 12, color: colors.neutral400 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: colors.neutral400 },
  time: { fontSize: 12, color: colors.neutral400 },
});
