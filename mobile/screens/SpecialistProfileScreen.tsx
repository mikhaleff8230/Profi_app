import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenLayout, useScrollBottomPadding } from "../components/ScreenLayout";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/api";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import { ScreenHeader } from "../components/ScreenHeader";
import { MOCK_SPECIALIST } from "../src/mocks/demoData";
import type { RootStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "SpecialistProfile">;

type Spec = {
  id: string;
  name: string;
  rating?: number;
  reviews_count?: number;
  city?: string | null;
  bio?: string | null;
  services?: string[];
};

export default function SpecialistProfileScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { specialistId } = route.params;
  const { t } = useLang();
  const [spec, setSpec] = useState<Spec | null>(null);
  const [demo, setDemo] = useState(false);
  const scrollPadding = useScrollBottomPadding(40);

  useEffect(() => {
    apiFetch(`/specialists/${specialistId}`, { method: "GET" })
      .then((d) => {
        setSpec(d as Spec);
        setDemo(false);
      })
      .catch(() => {
        setSpec({ ...MOCK_SPECIALIST, id: specialistId });
        setDemo(true);
      });
  }, [specialistId]);

  if (!spec) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "bottom", "left", "right"]}>
        <ActivityIndicator />
        <Text style={styles.muted}>{t("loading")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <ScreenLayout>
      <ScreenHeader title="" onBack={() => navigation.goBack()} />
      {demo && (
        <View style={styles.demoBar}>
          <Text style={styles.demoTxt}>{t("demo_data_banner")}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={[styles.scroll, scrollPadding]}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{spec.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{spec.name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={18} color={colors.black} />
            <Text style={styles.ratingNum}>{(spec.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.reviews}>
              {spec.reviews_count ?? 0} {t("reviews")}
            </Text>
          </View>
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
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  muted: { marginTop: 8, color: colors.neutral400 },
  demoBar: { backgroundColor: colors.lavender100, paddingVertical: 6 },
  demoTxt: { textAlign: "center", fontSize: 11, color: colors.neutral600 },
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
  avatarLetter: { fontSize: 36, fontWeight: "800", color: colors.black },
  name: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingNum: { fontWeight: "800", fontSize: 16 },
  reviews: { fontSize: 14, color: colors.neutral500 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  rowText: { fontSize: 15 },
  block: { marginBottom: 20 },
  caps: { fontSize: 12, fontWeight: "600", color: colors.neutral400, textTransform: "uppercase", marginBottom: 6 },
  body: { fontSize: 15, color: colors.neutral700, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.lavender100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full },
  chipText: { fontSize: 13, fontWeight: "600" },
});
