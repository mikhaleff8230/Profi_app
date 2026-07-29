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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TabScreenLayout } from "../components/TabScreenLayout";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, apiUploadFile, fileUrl } from "../src/api";
import { useAuth, type User } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import { fetchAccountSummary, type AccountSummary } from "../src/services/account";
import { formatRuNationalDisplay, toNational10FromApi } from "../src/utils/phone";
import type { RootStackParamList } from "../src/navigation/types";

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
type ServiceCategory = { id: string | number; name_ru: string };

type IdentityStatus = "not_submitted" | "pending" | "approved" | "rejected";

const IDENTITY_META: Record<IdentityStatus, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  not_submitted: { color: colors.neutral500, icon: "shield-outline" },
  pending: { color: "#D7A948", icon: "time-outline" },
  approved: { color: "#22C55E", icon: "checkmark-circle" },
  rejected: { color: "#EF4444", icon: "close-circle" },
};

function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return "—";
  const national = toNational10FromApi(phone);
  if (national.length === 10) return `+7 ${formatRuNationalDisplay(national)}`;
  return phone;
}

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser, logout } = useAuth();
  const { t } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus>("not_submitted");
  const [editingBio, setEditingBio] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingServices, setEditingServices] = useState(false);
  const [bio, setBio] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/auth/stats", { method: "GET" })
      .then(setStats)
      .catch(() => setStats(null));
    fetchAccountSummary().then(setAccount).catch(() => setAccount(null));
    apiFetch("/categories", { method: "GET" })
      .then((data) => setServiceCategories(Array.isArray(data) ? data : []))
      .catch(() => setServiceCategories([]));
    apiFetch("/identity-verification", { method: "GET" })
      .then((data) => {
        const status = data?.status as IdentityStatus | undefined;
        if (status && IDENTITY_META[status]) setIdentityStatus(status);
      })
      .catch(() => setIdentityStatus("not_submitted"));
  }, []);

  useEffect(() => {
    if (user) {
      setBio(user.bio || "");
      setName(user.name || "");
      setCity(user.city || "");
      setServices(user.services || []);
      setPortfolio(user.portfolio || []);
    }
  }, [user]);

  const identityText: Record<IdentityStatus, string> = {
    not_submitted: t("identity_not_submitted"),
    pending: t("identity_pending"),
    approved: t("identity_approved"),
    rejected: t("identity_rejected"),
  };

  const onLogout = () => {
    if (Platform.OS === "web") {
      if (globalThis.confirm?.(t("logout_confirm")) ?? true) {
        void logout();
      }
      return;
    }
    Alert.alert(t("logout_title"), t("logout_confirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("logout_action"), style: "destructive", onPress: () => void logout() },
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
      Alert.alert(t("error_title"), e instanceof Error ? e.message : String(e));
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
      };
      const data = await apiFetch("/auth/profile", { method: "PATCH", body: JSON.stringify(body) });
      setUser(data as User);
      setEditingName(false);
      Alert.alert(t("success"));
    } catch (e: unknown) {
      Alert.alert(t("error_title"), e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (service: string) => {
    setServices((current) => current.includes(service) ? current.filter((item) => item !== service) : [...current, service]);
  };

  const saveServices = async () => {
    setSaving(true);
    try {
      const data = await apiFetch("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ services }),
      });
      setUser(data as User);
      setEditingServices(false);
      Alert.alert(t("success"));
    } catch (e: unknown) {
      Alert.alert(t("error_title"), e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("photo_permission_title"), t("photo_permission_body"));
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
      Alert.alert(t("error_title"), e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }, [setUser, t]);

  const pickPortfolio = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("photo_permission_title"), t("photo_permission_body"));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 10 - portfolio.length),
    });
    if (res.canceled || !res.assets.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const asset of res.assets.slice(0, Math.max(0, 10 - portfolio.length))) {
        const upload = await apiUploadFile(asset.uri, asset.mimeType || "image/jpeg", "portfolio.jpg");
        uploaded.push(upload.path);
      }
      const nextPortfolio = [...portfolio, ...uploaded].slice(0, 10);
      const data = await apiFetch("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ portfolio: nextPortfolio }),
      });
      setUser(data as User);
      setPortfolio(nextPortfolio);
      Alert.alert(t("success"));
    } catch (e: unknown) {
      Alert.alert(t("error_title"), e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }, [portfolio, setUser, t]);

  if (!user) return null;

  const isSpecialist = user.role === "specialist";
  const avatarUri = fileUrl(user.avatar);
  const identity = IDENTITY_META[identityStatus];
  const identityLabel = identityText[identityStatus];

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
              <Ionicons name="log-out-outline" size={22} color={colors.neutral500} />
            </TouchableOpacity>
          </View>
        </View>

        <CardLight style={styles.phoneCard}>
          <Ionicons name="call-outline" size={18} color={colors.neutral500} />
          <Text style={styles.phoneText}>{formatPhoneDisplay(user.phone)}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("PhoneChange")}>
            <Text style={styles.linkText}>{t("change_phone")}</Text>
          </TouchableOpacity>
        </CardLight>

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
            <View style={styles.nameContent}>
              <Text style={styles.nameBig}>{user.name}</Text>
              {user.city ? (
                <View style={styles.cityRow}>
                  <Ionicons name="location-outline" size={16} color={colors.neutral500} />
                  <Text style={styles.cityText}>{user.city}</Text>
                </View>
              ) : null}
            </View>
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
            <View style={styles.editActions}>
              <PrimaryButton title={t("cancel")} variant="secondary" fullWidth={false} style={styles.half} onPress={() => setEditingName(false)} />
              <PrimaryButton title={t("save")} fullWidth={false} style={styles.half} onPress={saveName} loading={saving} />
            </View>
          </View>
        )}

        {isSpecialist && (
          <View style={[styles.verifiedPill, { backgroundColor: colors.lavender50 }]}>
            <Ionicons name={identity.icon} size={16} color={identity.color} />
            <Text style={[styles.verifiedText, { color: identity.color }]}>{identityLabel}</Text>
          </View>
        )}

        {isSpecialist && identityStatus !== "pending" && identityStatus !== "approved" && (
          <PrimaryButton
            title={t("verify_identity")}
            onPress={() => navigation.navigate("IdentityVerification")}
          />
        )}

        {isSpecialist && (
          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("MyReviews")}>
            <Text style={styles.menuRowText}>{t("my_reviews")}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.neutral400} />
          </TouchableOpacity>
        )}

        {isSpecialist && (
          <CardLight style={styles.balanceCard}>
            <View>
              <Text style={styles.balanceLabel}>{t("balance_label")}</Text>
              <Text style={styles.balanceValue}>{Math.round(account?.balance ?? 0).toLocaleString("ru-RU")} ₽</Text>
            </View>
            <View style={styles.freePill}>
              <Text style={styles.freePillValue}>{account?.free_remaining_today ?? 0}</Text>
              <Text style={styles.freePillText}>{t("responses_left")}</Text>
            </View>
          </CardLight>
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

        {isSpecialist && (
          <View style={styles.services}>
            <View style={styles.servicesHead}>
              <Text style={styles.servicesCaps}>{t("services")}</Text>
              <TouchableOpacity style={styles.iconBtn} onPress={() => { setServices(user.services || []); setEditingServices(true); }}>
                <Ionicons name="pencil" size={16} color={colors.black} />
              </TouchableOpacity>
            </View>
            {editingServices ? (
              <View style={styles.editBlock}>
                <View style={styles.chips}>
                  {serviceCategories.map((category) => {
                    const selected = services.includes(category.name_ru);
                    return (
                      <TouchableOpacity key={String(category.id)} style={[styles.serviceChoice, selected && styles.serviceChoiceSelected]} onPress={() => toggleService(category.name_ru)}>
                        <Ionicons name={selected ? "checkmark-circle" : "add-circle-outline"} size={17} color={colors.black} />
                        <Text style={styles.chipText}>{category.name_ru}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.editActions}>
                  <PrimaryButton title={t("cancel")} variant="secondary" fullWidth={false} style={styles.half} onPress={() => setEditingServices(false)} />
                  <PrimaryButton title={t("save")} fullWidth={false} style={styles.half} onPress={saveServices} loading={saving} />
                </View>
              </View>
            ) : user.services?.length ? (
              <View style={styles.chips}>
                {user.services.map((service) => <View key={service} style={styles.chip}><Text style={styles.chipText}>{service}</Text></View>)}
              </View>
            ) : (
              <Text style={styles.bioText}>Выберите услуги, которые вы выполняете</Text>
            )}
          </View>
        )}

        {isSpecialist && (
          <View style={styles.services}>
            <View style={styles.portfolioHead}>
              <Text style={styles.sectionTitle}>{t("portfolio_title")}</Text>
              <TouchableOpacity style={styles.addPortfolioBtn} onPress={pickPortfolio} disabled={uploading || portfolio.length >= 10}>
                <Ionicons name="add" size={18} color={colors.black} />
              </TouchableOpacity>
            </View>
            {portfolio.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portfolioTrack}>
                {portfolio.map((item, index) => {
                  const uri = fileUrl(item);
                  return uri ? <Image key={`${item}-${index}`} source={{ uri }} style={styles.portfolioImage} /> : null;
                })}
              </ScrollView>
            ) : (
              <Text style={styles.bioText}>{t("portfolio_add_hint")}</Text>
            )}
          </View>
        )}

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
    marginBottom: spacing.md,
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
  phoneCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.lg,
    backgroundColor: colors.lavender50,
    borderWidth: 0,
  },
  phoneText: { fontSize: 16, fontWeight: "700", color: colors.black, flex: 1 },
  linkText: { fontSize: 14, fontWeight: "700", color: colors.black, textDecorationLine: "underline" },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
    marginBottom: spacing.md,
  },
  menuRowText: { fontSize: 16, fontWeight: "700", color: colors.black },
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
  nameContent: { flex: 1, paddingRight: 10 },
  nameBig: { fontSize: 28, fontWeight: "800", lineHeight: 34, color: colors.black },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  cityText: { fontSize: 14, color: colors.neutral500 },
  verifiedPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    marginBottom: 16,
  },
  verifiedText: { fontSize: 14, fontWeight: "600" },
  statsCard: { backgroundColor: colors.lavender50, borderWidth: 0, marginBottom: 16 },
  balanceCard: {
    backgroundColor: "#D9F36B",
    borderWidth: 0,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: { fontSize: 12, fontWeight: "700", color: colors.neutral700, marginBottom: 4 },
  balanceValue: { fontSize: 26, fontWeight: "800", color: colors.black },
  freePill: { borderRadius: 18, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  freePillValue: { fontSize: 18, fontWeight: "800", color: colors.black },
  freePillText: { fontSize: 11, color: colors.neutral500 },
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
  servicesHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  servicesCaps: { fontSize: 12, fontWeight: "600", color: colors.neutral400, textTransform: "uppercase", marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.lavender100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full },
  chipText: { fontSize: 14, fontWeight: "600" },
  serviceChoice: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.lavender50, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radii.full, borderWidth: 1, borderColor: colors.neutral100 },
  serviceChoiceSelected: { backgroundColor: "#D9F36B", borderColor: "#D9F36B" },
  portfolioHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  addPortfolioBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lavender50, alignItems: "center", justifyContent: "center" },
  portfolioTrack: { gap: 10 },
  portfolioImage: { width: 104, height: 104, borderRadius: 16, backgroundColor: colors.lavender50 },
  footerMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.neutral100 },
  footerText: { fontSize: 14, color: colors.neutral500 },
});
