import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { TabScreenLayout } from "../components/TabScreenLayout";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, apiUploadFile, fileUrl } from "../src/api";
import { useAuth, type User } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";

import { PrimaryButton } from "../components/PrimaryButton";
import { CardLight } from "../components/CardLight";

type Stats = {
  role: string;
  applied?: number;
  accepted?: number;
  active_chats?: number;
  posted?: number;
  open?: number;
  open_tasks?: number;
  in_progress?: number;
};

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuth();
  const { t } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [bio, setBio] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [services, setServices] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/auth/stats", { method: "GET" })
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    if (user) {
      setBio(user.bio || "");
      setName(user.name || "");
      setCity(user.city || "");
      setServices((user.services || []).join(", "));
    }
  }, [user]);

  const onLogout = () => {
    if (Platform.OS === "web") {
      if (globalThis.confirm?.("Выйти из аккаунта?") ?? true) {
        void logout();
      }
      return;
    }
    Alert.alert("Выход", "Выйти из аккаунта?", [
      { text: t("cancel"), style: "cancel" },
      { text: "Выйти", style: "destructive", onPress: () => void logout() },
    ]);
  };

  const saveBio = async () => {
    setSaving(true);
    try {
      const data = await apiFetch("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ bio }),
      });
      setUser(data as User);
      setEditingBio(false);
      Alert.alert(t("success"));
    } catch (e: unknown) {
      Alert.alert("РћС€РёР±РєР°", e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const saveName = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name,
        city,
        services: services.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const data = await apiFetch("/auth/profile", { method: "PATCH", body: JSON.stringify(body) });
      setUser(data as User);
      setEditingName(false);
      Alert.alert(t("success"));
    } catch (e: unknown) {
      Alert.alert("РћС€РёР±РєР°", e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Р”РѕСЃС‚СѓРї", "РќСѓР¶РЅРѕ СЂР°Р·СЂРµС€РµРЅРёРµ РЅР° С„РѕС‚Рѕ");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]?.uri) return;
    setUploading(true);
    try {
      const asset = res.assets[0];
      const mime = asset.mimeType || "image/jpeg";
      const upload = await apiUploadFile(asset.uri, mime, "avatar.jpg");
      const data = await apiFetch("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ avatar: upload.path }),
      });
      setUser(data as User);
      Alert.alert(t("success"));
    } catch (e: unknown) {
      Alert.alert("РћС€РёР±РєР°", e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }, [setUser, t]);

  if (!user) return null;

  const isSpecialist = user.role === "specialist";
  const avatarUri = fileUrl(user.avatar);

  return (
    <TabScreenLayout>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{t("profile_title")}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onLogout}
              accessibilityRole="button"
              accessibilityLabel="Выйти"
            >
              <Ionicons name="settings-outline" size={22} color={colors.neutral500} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{(user.name || "?").charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.camBtn} onPress={pickAvatar} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <Ionicons name="camera" size={16} color={colors.black} />
              )}
            </TouchableOpacity>
          </View>
          {isSpecialist && (
            <View style={styles.ratingCol}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={20} color={colors.black} />
                <Text style={styles.ratingNum}>{(user.rating ?? 0).toFixed(1)}</Text>
              </View>
              <View style={styles.ratingRow}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.neutral500} />
                <Text style={styles.ratingSub}>
                  {user.reviews_count ?? 0} {t("reviews")}
                </Text>
              </View>
              <View style={styles.ratingRow}>
                <Ionicons name="add-circle-outline" size={18} color={colors.neutral400} />
                <Text style={styles.ratingMuted}>{t("highly_rated")}</Text>
              </View>
            </View>
          )}
        </View>

        {!editingName ? (
          <View style={styles.nameRow}>
            <Text style={styles.nameBig}>{user.name}</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setEditingName(true)}>
              <Ionicons name="pencil" size={18} color={colors.black} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.editBlock}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t("name_placeholder")}
              placeholderTextColor={colors.neutral400}
            />
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder={t("city_placeholder")}
              placeholderTextColor={colors.neutral400}
            />
            {isSpecialist && (
              <TextInput
                style={styles.input}
                value={services}
                onChangeText={setServices}
                placeholder={t("services")}
                placeholderTextColor={colors.neutral400}
              />
            )}
            <View style={styles.editActions}>
              <PrimaryButton title={t("cancel")} variant="secondary" fullWidth={false} style={styles.half} onPress={() => setEditingName(false)} />
              <PrimaryButton title={t("save")} fullWidth={false} style={styles.half} onPress={saveName} loading={saving} />
            </View>
          </View>
        )}

        {isSpecialist && (
          <View style={styles.verifiedPill}>
            <Ionicons name="checkmark-circle" size={16} color={colors.black} />
            <Text style={styles.verifiedText}>{t("verified_passport")}</Text>
          </View>
        )}

        <CardLight style={styles.statsCard}>
          <View style={styles.statsRow}>
            <Text style={styles.statsTitle}>{t("my_statistics")}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral400} />
          </View>
        </CardLight>

        {stats && (
          <View style={styles.statsGrid}>
            {stats.role === "specialist" ? (
              <>
                <Stat label={t("stat_applied")} value={stats.applied ?? 0} />
                <Stat label={t("stat_accepted")} value={stats.accepted ?? 0} />
                <Stat label={t("stat_chats")} value={stats.active_chats ?? 0} />
              </>
            ) : (
              <>
                <Stat label={t("stat_posted")} value={stats.posted ?? 0} />
                <Stat label={t("stat_open")} value={stats.open ?? stats.open_tasks ?? 0} />
                <Stat label={t("stat_in_progress")} value={stats.in_progress ?? 0} />
              </>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>{t("about_me")}</Text>
        {!editingBio ? (
          <View style={styles.bioRow}>
            <Text style={styles.bioText}>{user.bio || t("about_me_placeholder")}</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setBio(user.bio || ""); setEditingBio(true); }}>
              <Ionicons name="pencil" size={16} color={colors.black} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.editBlock}>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={bio}
              onChangeText={setBio}
              placeholder={t("bio_placeholder")}
              placeholderTextColor={colors.neutral400}
              multiline
            />
            <View style={styles.editActions}>
              <PrimaryButton title={t("cancel")} variant="secondary" fullWidth={false} style={styles.half} onPress={() => setEditingBio(false)} />
              <PrimaryButton title={t("save")} fullWidth={false} style={styles.half} onPress={saveBio} loading={saving} />
            </View>
          </View>
        )}

        {isSpecialist && user.services && user.services.length > 0 && (
          <View style={styles.services}>
            <Text style={styles.servicesCaps}>{t("services")}</Text>
            <View style={styles.chips}>
              {user.services.map((s, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footerMeta}>
          <Ionicons name="call-outline" size={16} color={colors.neutral500} />
          <Text style={styles.footerText}>{user.phone || "вЂ”"}</Text>
          {user.city ? (
            <>
              <Text style={styles.dot}>вЂў</Text>
              <Ionicons name="location-outline" size={16} color={colors.neutral500} />
              <Text style={styles.footerText}>{user.city}</Text>
            </>
          ) : null}
        </View>
      </ScrollView>
    </TabScreenLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: { ...typography.title, fontSize: 22 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lavender50,
  },
  avatarRow: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 16 },
  avatarWrap: { position: "relative" },
  avatarImg: { width: 96, height: 96, borderRadius: 16, backgroundColor: colors.lavender100 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 36, fontWeight: "800", color: colors.black },
  camBtn: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  ratingCol: { flex: 1, paddingTop: 4, gap: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingNum: { fontSize: 20, fontWeight: "800" },
  ratingSub: { fontSize: 14, color: colors.neutral700 },
  ratingMuted: { fontSize: 14, color: colors.neutral400 },
  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  nameBig: { flex: 1, fontSize: 28, fontWeight: "800", lineHeight: 34, color: colors.black },
  verifiedPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.lavender100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    marginBottom: 16,
  },
  verifiedText: { fontSize: 14, fontWeight: "600" },
  statsCard: { backgroundColor: colors.lavender50, borderWidth: 0, marginBottom: 16 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statsTitle: { fontSize: 18, fontWeight: "800" },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCell: { flex: 1 },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600", color: colors.neutral500, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  bioRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  bioText: { flex: 1, fontSize: 16, color: colors.neutral700, lineHeight: 24 },
  editBlock: { marginBottom: 16, gap: 8 },
  input: {
    backgroundColor: colors.lavender50,
    borderRadius: radii.lg,
    padding: 16,
    fontSize: 16,
    color: colors.black,
    minHeight: 52,
  },
  textarea: { minHeight: 120, textAlignVertical: "top" },
  editActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  half: { flex: 1 },
  services: { marginBottom: 20 },
  servicesCaps: { fontSize: 12, fontWeight: "600", color: colors.neutral400, textTransform: "uppercase", marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.lavender100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full },
  chipText: { fontSize: 14, fontWeight: "600" },
  footerMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.neutral100 },
  footerText: { fontSize: 14, color: colors.neutral500 },
  dot: { color: colors.neutral500 },
});
