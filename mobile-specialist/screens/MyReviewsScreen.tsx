import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenLayout } from "../components/ScreenLayout";
import { ScreenHeader } from "../components/ScreenHeader";
import { CardLight } from "../components/CardLight";
import { apiFetch, fileUrl } from "../src/api";
import { useAuth } from "../src/context/AuthContext";
import { colors, spacing, typography } from "../src/theme";
import type { RootStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  customer_name?: string | null;
  task_title?: string | null;
  photos?: string[];
  created_at?: string | null;
};

export default function MyReviewsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch(`/specialists/${user.id}/reviews`, { method: "GET" });
      setReviews(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  return (
    <ScreenLayout>
      <ScreenHeader title="Мои отзывы" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.black} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.black} />}
        >
          {!reviews.length ? (
            <CardLight style={styles.emptyCard}>
              <Ionicons name="star-outline" size={28} color={colors.neutral400} />
              <Text style={styles.emptyTitle}>Отзывов пока нет</Text>
              <Text style={styles.emptyText}>Когда заказчики оставят оценки, они появятся здесь.</Text>
            </CardLight>
          ) : (
            reviews.map((review) => (
              <CardLight key={review.id} style={styles.card}>
                <View style={styles.headerRow}>
                  <View style={styles.stars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < review.rating ? "star" : "star-outline"}
                        size={16}
                        color={colors.black}
                      />
                    ))}
                  </View>
                  <Text style={styles.rating}>{review.rating}/5</Text>
                </View>

                <Text style={styles.author}>{review.customer_name || "Клиент"}</Text>
                {review.task_title ? <Text style={styles.task}>{review.task_title}</Text> : null}
                {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}

                {!!review.photos?.length && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photos}>
                    {review.photos.map((photo, idx) => {
                      const uri = fileUrl(photo);
                      if (!uri) return null;
                      return <Image key={`${review.id}-${idx}`} source={{ uri }} style={styles.photo} />;
                    })}
                  </ScrollView>
                )}
              </CardLight>
            ))
          )}
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  emptyCard: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  emptyTitle: { ...typography.headline, color: colors.black },
  emptyText: { ...typography.body, color: colors.neutral500, textAlign: "center" },
  card: { gap: spacing.sm },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stars: { flexDirection: "row", alignItems: "center", gap: 4 },
  rating: { fontSize: 13, fontWeight: "700", color: colors.neutral500 },
  author: { fontSize: 13, fontWeight: "700", color: colors.black },
  task: { fontSize: 12, color: colors.neutral500 },
  comment: { ...typography.body, color: colors.black },
  photos: { marginTop: spacing.xs },
  photo: { width: 72, height: 72, borderRadius: 12, marginRight: spacing.sm },
});
