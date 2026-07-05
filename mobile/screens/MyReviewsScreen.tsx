import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
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
  photos?: string[];
};

export default function MyReviewsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    apiFetch(`/specialists/${user.id}/reviews`, { method: "GET" })
      .then((data) => setReviews(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <ScreenLayout>
      <ScreenHeader title="Мои отзывы" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.black} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {!reviews.length ? (
            <Text style={styles.empty}>Отзывов пока нет</Text>
          ) : (
            reviews.map((review) => (
              <CardLight key={review.id} style={styles.card}>
                <View style={styles.stars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < review.rating ? "star" : "star-outline"}
                      size={16}
                      color={colors.black}
                    />
                  ))}
                  <Text style={styles.author}>{review.customer_name || "Клиент"}</Text>
                </View>
                {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}
                {!!review.photos?.length && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photos}>
                    {review.photos.map((photo, idx) => {
                      const uri = fileUrl(photo);
                      if (!uri) return null;
                      return <Image key={idx} source={{ uri }} style={styles.photo} />;
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
  empty: { ...typography.body, color: colors.neutral500, textAlign: "center", marginTop: spacing.xl },
  card: { gap: spacing.sm },
  stars: { flexDirection: "row", alignItems: "center", gap: 4 },
  author: { marginLeft: spacing.sm, color: colors.neutral500, fontSize: 12 },
  comment: { ...typography.body, color: colors.black },
  photos: { marginTop: spacing.xs },
  photo: { width: 72, height: 72, borderRadius: 12, marginRight: spacing.sm },
});
