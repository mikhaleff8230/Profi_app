import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenLayout, useScrollBottomPadding } from "../components/ScreenLayout";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, fileUrl } from "../src/api";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import { ScreenHeader } from "../components/ScreenHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../src/navigation/types";
import type { Specialist, SpecialistReview } from "../src/types/proffi";
import { resolveTaskPhotos } from "../src/utils/photos";
import { timeAgo } from "../src/utils/timeAgo";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "SpecialistProfile">;

export default function SpecialistProfileScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { specialistId } = route.params;
  const { t, lang } = useLang();
  const [spec, setSpec] = useState<Specialist | null>(null);
  const [reviews, setReviews] = useState<SpecialistReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollPadding = useScrollBottomPadding(40);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, reviewData] = await Promise.all([
        apiFetch(`/specialists/${specialistId}`, { method: "GET" }),
        apiFetch(`/specialists/${specialistId}/reviews`, { method: "GET" }).catch(() => []),
      ]);
      setSpec(profile as Specialist);
      setReviews(Array.isArray(reviewData) ? reviewData : []);
    } catch (e: unknown) {
      setSpec(null);
      setReviews([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [specialistId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "bottom", "left", "right"]}>
        <ActivityIndicator />
        <Text style={styles.muted}>{t("loading")}</Text>
      </SafeAreaView>
    );
  }

  if (!spec || error) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "bottom", "left", "right"]}>
        <Text style={styles.errorTitle}>{t("specialist_not_found")}</Text>
        <Text style={styles.errorText}>{error || t("no_tasks")}</Text>
        <PrimaryButton title={t("retry")} fullWidth={false} style={styles.errorBtn} onPress={load} />
        <PrimaryButton title={t("cancel")} variant="secondary" fullWidth={false} style={styles.errorBtn} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const avatarUri = spec.avatar ? fileUrl(spec.avatar) : null;
  const portfolio = resolveTaskPhotos(spec.portfolio);

  return (
    <ScreenLayout>
      <ScreenHeader title="" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.scroll, scrollPadding]}>
        <View style={styles.hero}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{spec.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name}>{spec.name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={18} color={colors.black} />
            <Text style={styles.ratingNum}>{(spec.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.reviews}>
              {spec.reviews_count ?? 0} {t("reviews")}
            </Text>
          </View>
          {spec.last_seen ? (
            <Text style={styles.lastSeen}>
              {t("last_seen")}: {timeAgo(spec.last_seen, lang)}
            </Text>
          ) : null}
        </View>

        {spec.city ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color={colors.neutral500} />
            <Text style={styles.rowText}>{spec.city}</Text>
          </View>
        ) : null}

        {spec.bio ? (
          <View style={styles.block}>
            <Text style={styles.caps}>{t("bio")}</Text>
            <Text style={styles.body}>{spec.bio}</Text>
          </View>
        ) : null}

        {spec.services && spec.services.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.caps}>{t("services")}</Text>
            <View style={styles.chips}>
              {spec.services.map((s, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {portfolio.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.caps}>Портфолио</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portfolio}>
              {portfolio.map((uri, index) => (
                <Image key={`${uri}-${index}`} source={{ uri }} style={styles.portfolioImage} />
              ))}
            </ScrollView>
          </View>
        )}

        {reviews.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.caps}>{t("reviews_section")}</Text>
            {reviews.map((review) => (
              <View key={String(review.id)} style={styles.reviewCard}>
                <View style={styles.reviewHead}>
                  <Text style={styles.reviewAuthor}>{review.author_name || "Клиент"}</Text>
                  <Text style={styles.reviewRating}>{review.rating} ★</Text>
                </View>
                {review.text ? <Text style={styles.body}>{review.text}</Text> : null}
                {review.created_at ? (
                  <Text style={styles.reviewDate}>{timeAgo(review.created_at, lang)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  muted: { marginTop: 8, color: colors.neutral400 },
  errorTitle: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  errorText: { color: colors.neutral500, textAlign: "center", marginBottom: 16 },
  errorBtn: { marginTop: 8, paddingHorizontal: 24 },
  scroll: { paddingHorizontal: spacing.xl },
  hero: { alignItems: "center", paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: colors.neutral100, marginBottom: 16 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.lavender100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarLetter: { fontSize: 36, fontWeight: "800", color: colors.black },
  name: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingNum: { fontWeight: "800", fontSize: 16 },
  reviews: { fontSize: 14, color: colors.neutral500 },
  lastSeen: { marginTop: 8, fontSize: 13, color: colors.neutral500 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  rowText: { fontSize: 15 },
  block: { marginBottom: 20 },
  caps: { fontSize: 12, fontWeight: "600", color: colors.neutral400, textTransform: "uppercase", marginBottom: 6 },
  body: { fontSize: 15, color: colors.neutral700, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.lavender100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full },
  chipText: { fontSize: 13, fontWeight: "600" },
  portfolio: { gap: 10 },
  portfolioImage: { width: 120, height: 120, borderRadius: 16, backgroundColor: colors.lavender50 },
  reviewCard: {
    backgroundColor: colors.lavender50,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  reviewHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewAuthor: { fontWeight: "700" },
  reviewRating: { fontWeight: "700" },
  reviewDate: { fontSize: 12, color: colors.neutral400 },
});
